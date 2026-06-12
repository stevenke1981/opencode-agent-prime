import { isMasterAgentName, type PluginConfig } from "../config";
import { PLAN_MODE_REMINDER } from "../config/constants";

interface SystemTransformOutput {
  system: string[];
}

export function createPlanModeHook(
  config: PluginConfig,
  options?: { getAgentName?: (sessionID: string) => string | undefined },
): {
  "experimental.chat.system.transform": (
    input: { sessionID?: string },
    output: SystemTransformOutput,
  ) => Promise<void>;
} {
  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (!config.planMode.enabled) return;
      if (!input.sessionID) return;
      if (!isMasterAgentName(options?.getAgentName?.(input.sessionID))) {
        return;
      }

      const block = `<plan_mode_protocol>
Plans directory: ${config.planMode.plansDir}
Minimum complexity requiring a plan: ${config.planMode.minComplexity}
${PLAN_MODE_REMINDER}
</plan_mode_protocol>`;

      if (
        output.system.some((entry) => entry.includes("<plan_mode_protocol>"))
      ) {
        return;
      }
      output.system.push(block);
    },
  };
}
