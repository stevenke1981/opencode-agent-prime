import { isMasterAgentName, type PluginConfig } from "../config";
import { ERROR_RECOVERY_REMINDER } from "../config/constants";

interface SystemTransformOutput {
  system: string[];
}

const failureCounts = new Map<string, number>();
const pendingEscalations = new Map<string, string>();

export function recordToolFailure(
  sessionID: string,
  config: PluginConfig,
): void {
  if (!config.errorRecovery.enabled) return;
  const count = (failureCounts.get(sessionID) ?? 0) + 1;
  failureCounts.set(sessionID, count);
  if (count < config.errorRecovery.minAttemptsBeforeEscalate) return;

  pendingEscalations.set(
    sessionID,
    `<error_recovery_escalation attempts="${count}">
${ERROR_RECOVERY_REMINDER}
You have hit ${count} tool failures in this session. Re-examine root assumptions,
try a completely different technical path, or deliver a minimum viable partial
result with explicit limits.
</error_recovery_escalation>`,
  );
}

export function consumeErrorEscalation(sessionID: string): string | null {
  const reminder = pendingEscalations.get(sessionID);
  if (!reminder) return null;
  pendingEscalations.delete(sessionID);
  return reminder;
}

export function createErrorRecoveryHook(
  config: PluginConfig,
  options?: { getAgentName?: (sessionID: string) => string | undefined },
): {
  "tool.execute.after": (input: {
    tool: string;
    sessionID?: string;
    error?: unknown;
  }) => Promise<void>;
  "experimental.chat.system.transform": (
    input: { sessionID?: string },
    output: SystemTransformOutput,
  ) => Promise<void>;
} {
  return {
    "tool.execute.after": async (input) => {
      if (!input.error || !input.sessionID) return;
      recordToolFailure(input.sessionID, config);
    },

    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return;
      if (!isMasterAgentName(options?.getAgentName?.(input.sessionID))) {
        return;
      }
      const escalation = consumeErrorEscalation(input.sessionID);
      if (!escalation) return;
      output.system.push(escalation);
    },
  };
}
