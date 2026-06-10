import type { Plugin } from "@opencode-ai/plugin";
import { createAgents, getAgentConfigs } from "./agents";
import { loadPluginConfig } from "./config";
import {
  createErrorRecoveryHook,
  createLessonsRsiHook,
  createMemoryMcpHook,
  createPlanModeHook,
} from "./hooks";

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

const OpenCodeAgentPrime: Plugin = async (ctx) => {
  const config = loadPluginConfig(ctx.directory);
  const agents = createAgents(ctx.directory, config);
  const agentConfigs = getAgentConfigs(agents);

  const sessionAgents = new Map<string, string>();

  const getAgentName = (sessionID: string): string | undefined =>
    sessionAgents.get(sessionID);

  const lessonsHook = createLessonsRsiHook(ctx.directory, config, {
    getAgentName,
  });
  const planModeHook = createPlanModeHook(config, { getAgentName });
  const memoryMcpHook = createMemoryMcpHook(config, { getAgentName });
  const errorRecoveryHook = createErrorRecoveryHook(config, { getAgentName });

  await appLog(
    ctx,
    "info",
    `Loaded ${Object.keys(agentConfigs).length} agents (locale: ${config.locale})`,
  );

  return {
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

    "tool.execute.after": errorRecoveryHook["tool.execute.after"],
  };
};

export default OpenCodeAgentPrime;
export { OpenCodeAgentPrime };
