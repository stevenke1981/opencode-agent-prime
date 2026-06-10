import { ALL_AGENT_NAMES } from "./constants";
import type { AgentOverrideConfig, PluginConfig } from "./schema";

/** Custom agents are unknown keys in config.agents (not built-in names). */
export function getCustomAgentNames(
  config: PluginConfig | undefined,
): string[] {
  const overrides = config?.agents ?? {};
  return Object.keys(overrides).filter(
    (name) => !(ALL_AGENT_NAMES as readonly string[]).includes(name),
  );
}

export function getAgentOverrideFromAgents(
  config: PluginConfig | undefined,
  name: string,
): AgentOverrideConfig | undefined {
  return config?.agents?.[name];
}
