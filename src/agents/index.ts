import type { AgentConfig as SDKAgentConfig } from "@opencode-ai/sdk/v2";
import {
  ALL_AGENT_NAMES,
  DEFAULT_DISABLED_AGENTS,
  DEFAULT_MODELS,
  getAgentOverride,
  loadPluginConfig,
  type PluginConfig,
  SUBAGENT_NAMES,
} from "../config";
import { createOrchestratorAgent } from "./orchestrator";
import { createSpecialistAgent } from "./specialists";

export interface RegisteredAgent {
  name: string;
  description?: string;
  config: SDKAgentConfig;
}

function applyOverride(
  agent: RegisteredAgent,
  override: ReturnType<typeof getAgentOverride>,
): void {
  if (!override) return;
  if (override.model) agent.config.model = override.model;
  if (override.variant) agent.config.variant = override.variant;
  if (override.temperature !== undefined) {
    agent.config.temperature = override.temperature;
  }
}

export function getDisabledAgents(config: PluginConfig): Set<string> {
  const disabled = new Set(DEFAULT_DISABLED_AGENTS);
  for (const name of config.disabled_agents ?? []) {
    disabled.add(name);
  }
  return disabled;
}

export function createAgents(
  directory: string,
  config?: PluginConfig,
): Record<string, RegisteredAgent> {
  const resolved = config ?? loadPluginConfig(directory);
  const disabled = getDisabledAgents(resolved);
  const agents: Record<string, RegisteredAgent> = {};

  if (!disabled.has("orchestrator")) {
    const orchestrator = createOrchestratorAgent(
      resolved,
      getAgentOverride(resolved, "orchestrator")?.model ??
        DEFAULT_MODELS.orchestrator,
    );
    applyOverride(orchestrator, getAgentOverride(resolved, "orchestrator"));
    agents.orchestrator = orchestrator;
  }

  for (const name of SUBAGENT_NAMES) {
    if (disabled.has(name)) continue;
    const model =
      getAgentOverride(resolved, name)?.model ??
      DEFAULT_MODELS[name as keyof typeof DEFAULT_MODELS];
    if (!model) continue;
    const specialist = createSpecialistAgent(name, model);
    applyOverride(specialist, getAgentOverride(resolved, name));
    agents[name] = specialist;
  }

  return agents;
}

export function getAgentConfigs(
  agents: Record<string, RegisteredAgent>,
): Record<string, SDKAgentConfig> {
  const configs: Record<string, SDKAgentConfig> = {};
  for (const [name, agent] of Object.entries(agents)) {
    configs[name] = agent.config;
  }
  return configs;
}

export { ALL_AGENT_NAMES };
