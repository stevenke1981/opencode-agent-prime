import * as fs from "node:fs/promises";
import { join } from "node:path";
import { isMasterAgentName, type PluginConfig } from "../config";

interface SystemTransformOutput {
  system: string[];
}

const injectedSessions = new Set<string>();
const pendingIdleReminders = new Map<string, string>();

function resolveLessonsPath(directory: string, config: PluginConfig): string {
  const configured = config.lessons.path;
  if (configured.startsWith("/") || /^[A-Za-z]:/.test(configured)) {
    return configured;
  }
  return join(directory, configured);
}

async function readLessonsSummary(
  directory: string,
  config: PluginConfig,
): Promise<string | null> {
  const path = resolveLessonsPath(directory, config);
  try {
    const content = await fs.readFile(path, "utf8");
    const trimmed = content.trim();
    if (!trimmed) return null;
    const lines = trimmed.split("\n");
    const tail = lines.slice(-40).join("\n");
    return `<lessons_context source="${config.lessons.path}">
Read and apply these lessons from prior sessions. Cite as "Applying lesson #N" when used.
${tail}
</lessons_context>`;
  } catch {
    return null;
  }
}

export function consumeIdleLessonReminder(sessionID: string): string | null {
  const reminder = pendingIdleReminders.get(sessionID);
  if (!reminder) return null;
  pendingIdleReminders.delete(sessionID);
  return reminder;
}

export function createLessonsRsiHook(
  directory: string,
  config: PluginConfig,
  options?: { getAgentName?: (sessionID: string) => string | undefined },
): {
  "experimental.chat.system.transform": (
    input: { sessionID?: string },
    output: SystemTransformOutput,
  ) => Promise<void>;
  event: (input: {
    event: { type: string; properties?: Record<string, unknown> };
  }) => Promise<void>;
} {
  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return;
      if (!isMasterAgentName(options?.getAgentName?.(input.sessionID))) {
        return;
      }

      const idleReminder = consumeIdleLessonReminder(input.sessionID);
      if (idleReminder) {
        output.system.push(idleReminder);
      }

      if (!config.lessons.enabled || !config.lessons.readAtSessionStart) {
        return;
      }
      if (injectedSessions.has(input.sessionID)) return;

      const block = await readLessonsSummary(directory, config);
      if (!block) return;
      if (output.system.some((entry) => entry.includes("<lessons_context"))) {
        return;
      }
      output.system.push(block);
      injectedSessions.add(input.sessionID);
    },

    event: async (input) => {
      if (!config.lessons.enabled || !config.lessons.promptAfterIdle) return;
      if (input.event.type !== "session.idle") return;

      const props = input.event.properties ?? {};
      const info = props.info as { id?: string; parentID?: string } | undefined;
      const sessionID = info?.id;
      if (!sessionID || info?.parentID) return;
      if (!isMasterAgentName(options?.getAgentName?.(sessionID))) return;

      const path = config.lessons.path;
      pendingIdleReminders.set(
        sessionID,
        `<lessons_rsi_reminder>
Session idle — if this task surfaced a reusable mistake or prevention rule,
append one concrete lesson to ${path} (append-only, never overwrite).
Format: Lesson #N — date, Trigger, Rule, Source.
</lessons_rsi_reminder>`,
      );
    },
  };
}
