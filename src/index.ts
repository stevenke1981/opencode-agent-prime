import type { Plugin } from "@opencode-ai/plugin";
import { createAgents, getAgentConfigs } from "./agents";
import { loadPluginConfig } from "./config";
import { CouncilManager } from "./council";
import {
  createDelegateTaskRetryHook,
  createErrorRecoveryHook,
  createLessonsRsiHook,
  createMemoryMcpHook,
  createPlanModeHook,
  createTaskSessionManagerHook,
} from "./hooks";
import {
  ast_grep_replace,
  ast_grep_search,
  createCouncilTool,
  createWebfetchTool,
} from "./tools";
import { SubagentDepthTracker } from "./utils/subagent-depth";

async function appLog(
  ctx: Parameters<Plugin>[0],
  level: "error" | "warn" | "info",
  message: string,
): Promise<void> {
  try {
    await ctx.client.app.log({
      body: { service: "opencode-agent-prime", level, message },
    });
  } catch {
    const prefix =
      level === "error" ? "ERROR" : level === "warn" ? "WARN" : "INFO";
    console.error(`[opencode-agent-prime] ${prefix}: ${message}`);
  }
}

async function probeJSDOM(): Promise<string | null> {
  try {
    const { JSDOM } = await import("jsdom");
    new JSDOM("<!DOCTYPE html><html><body>test</body></html>");
    return null;
  } catch (err) {
    return String(err);
  }
}

const OpenCodeAgentPrime: Plugin = async (ctx) => {
  const config = loadPluginConfig(ctx.directory);
  const agents = createAgents(ctx.directory, config);
  const agentConfigs = getAgentConfigs(agents);

  const sessionAgents = new Map<string, string>();
  const depthTracker = new SubagentDepthTracker();

  const getAgentName = (sessionID: string): string | undefined =>
    sessionAgents.get(sessionID);

  const lessonsHook = createLessonsRsiHook(ctx.directory, config, {
    getAgentName,
  });
  const planModeHook = createPlanModeHook(config, { getAgentName });
  const memoryMcpHook = createMemoryMcpHook(config, { getAgentName });
  const errorRecoveryHook = createErrorRecoveryHook(config, { getAgentName });
  const delegateTaskRetryHook = createDelegateTaskRetryHook(ctx);
  const taskSessionManagerHook = createTaskSessionManagerHook(ctx, {
    maxSessionsPerAgent: config.sessionManager?.maxSessionsPerAgent ?? 2,
    readContextMinLines: config.sessionManager?.readContextMinLines ?? 10,
    readContextMaxFiles: config.sessionManager?.readContextMaxFiles ?? 8,
    shouldManageSession: (sessionID) =>
      sessionAgents.get(sessionID) === "orchestrator",
  });

  const councilTools = config.council
    ? createCouncilTool(
        ctx,
        new CouncilManager(ctx, config, depthTracker, false),
      )
    : {};

  const webfetch = createWebfetchTool(ctx);

  await appLog(
    ctx,
    "info",
    `Loaded ${Object.keys(agentConfigs).length} agents, ${
      Object.keys(councilTools).length + 3
    } tools (locale: ${config.locale})`,
  );

  probeJSDOM().then((err) => {
    if (err) {
      const msg = `jsdom probe failed; webfetch tool will not work: ${err}`;
      appLog(ctx, "warn", msg).catch(() => {});
    }
  });

  return {
    tool: {
      ...councilTools,
      webfetch,
      ast_grep_search,
      ast_grep_replace,
    },

    config: async (opencodeConfig) => {
      const existingAgents = (opencodeConfig.agent ?? {}) as Record<
        string,
        unknown
      >;
      opencodeConfig.agent = {
        ...existingAgents,
        ...agentConfigs,
        build: { ...(existingAgents.build as object), disable: true },
        explore: { ...(existingAgents.explore as object), disable: true },
        general: { ...(existingAgents.general as object), disable: true },
        plan: { ...(existingAgents.plan as object), disable: true },
      };
    },

    event: async (input) => {
      const event = input.event;
      if (
        event.type === "session.updated" ||
        event.type === "session.created"
      ) {
        const info = event.properties?.info as
          | { id?: string; agent?: string }
          | undefined;
        if (info?.id && info.agent) {
          sessionAgents.set(info.id, info.agent);
        }
      }
      if (event.type === "session.deleted") {
        const props = event.properties as
          | { info?: { id?: string }; sessionID?: string }
          | undefined;
        const sessionID = props?.info?.id ?? props?.sessionID;
        if (sessionID) sessionAgents.delete(sessionID);
      }
      await lessonsHook.event(input);
      await taskSessionManagerHook.event(
        input as {
          event: {
            type: string;
            properties?: { info?: { id?: string }; sessionID?: string };
          };
        },
      );
    },

    "tool.execute.before": async (input, output) => {
      await taskSessionManagerHook["tool.execute.before"](
        input as {
          tool: string;
          sessionID?: string;
          callID?: string;
        },
        output as { args?: unknown },
      );
    },

    "experimental.chat.system.transform": async (input, output) => {
      const normalized = Array.isArray(output)
        ? { system: output as string[] }
        : (output as { system: string[] });

      await lessonsHook["experimental.chat.system.transform"](
        input,
        normalized,
      );
      await planModeHook["experimental.chat.system.transform"](
        input,
        normalized,
      );
      await memoryMcpHook["experimental.chat.system.transform"](
        input,
        normalized,
      );
      await errorRecoveryHook["experimental.chat.system.transform"](
        input,
        normalized,
      );

      if (Array.isArray(output)) {
        output.length = 0;
        output.push(...normalized.system);
      }
    },

    "experimental.chat.messages.transform": async (input, output) => {
      await taskSessionManagerHook["experimental.chat.messages.transform"](
        input,
        output as {
          messages: Array<{
            info: { role: string; agent?: string; sessionID?: string };
            parts: Array<{ type: string; text?: string }>;
          }>;
        },
      );
    },

    "tool.execute.after": async (input, output) => {
      await errorRecoveryHook["tool.execute.after"](
        input as {
          tool: string;
          sessionID?: string;
          error?: unknown;
        },
      );
      await delegateTaskRetryHook["tool.execute.after"](
        input as { tool: string },
        output as { output: unknown },
      );
      await taskSessionManagerHook["tool.execute.after"](
        input as {
          tool: string;
          sessionID?: string;
          callID?: string;
        },
        output as { output: unknown },
      );
    },
  };
};

export default OpenCodeAgentPrime;
export { OpenCodeAgentPrime };
