import type { AgentConfig as SDKAgentConfig } from "@opencode-ai/sdk/v2";
import {
  ALL_AGENT_NAMES,
  DEFAULT_DISABLED_AGENTS,
  DEFAULT_MODELS,
  getAgentOverride,
  isMasterAgentName,
  loadPluginConfig,
  MASTER_AGENT_NAME,
  type PluginConfig,
  PROTECTED_AGENTS,
  SUBAGENT_NAMES,
} from "../config";
import { createCouncilAgent } from "./council";
import { createCouncillorAgent } from "./councillor";
import { createOrchestratorAgent } from "./orchestrator";
import { createSpecialistAgent } from "./specialists";

export interface RegisteredAgent {
  name: string;
  description?: string;
  config: SDKAgentConfig;
}

const COUNCIL_TOOL_ALLOWED_AGENTS = new Set(["council"]);

const USER_FACING_SUBAGENTS = [
  "explorer",
  "librarian",
  "oracle",
  "designer",
  "fixer",
  "council",
] as const;

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

function applyDefaultPermissions(agent: RegisteredAgent): void {
  const existing = (agent.config.permission ?? {}) as Record<
    string,
    "ask" | "allow" | "deny" | Record<string, "ask" | "allow" | "deny">
  >;

  const questionPerm = existing.question === "deny" ? "deny" : "allow";
  const councilSessionPerm = COUNCIL_TOOL_ALLOWED_AGENTS.has(agent.name)
    ? (existing.council_session ?? "allow")
    : "deny";

  agent.config.permission = {
    ...existing,
    question: questionPerm,
    council_session: councilSessionPerm,
  } as SDKAgentConfig["permission"];
}

function applyAgentClassification(name: string, config: SDKAgentConfig): void {
  if (name === "council") {
    config.mode = "all";
    return;
  }
  if (name === "councillor") {
    config.mode = "subagent";
    (config as SDKAgentConfig & { hidden?: boolean }).hidden = true;
    return;
  }
  if (isMasterAgentName(name)) {
    config.mode = "primary";
    return;
  }
  config.mode = "subagent";
}

export function getDisabledAgents(config: PluginConfig): Set<string> {
  const disabled = new Set(DEFAULT_DISABLED_AGENTS);
  for (const name of config.disabled_agents ?? []) {
    if (!PROTECTED_AGENTS.has(name)) {
      disabled.add(name);
    }
  }
  if (!config.council) {
    disabled.add("council");
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

  if (!disabled.has(MASTER_AGENT_NAME)) {
    const mastermind = createOrchestratorAgent(
      resolved,
      getAgentOverride(resolved, MASTER_AGENT_NAME)?.model ??
        DEFAULT_MODELS[MASTER_AGENT_NAME],
    );
    applyOverride(mastermind, getAgentOverride(resolved, MASTER_AGENT_NAME));
    applyDefaultPermissions(mastermind);
    agents[MASTER_AGENT_NAME] = mastermind;
  }

  for (const name of USER_FACING_SUBAGENTS) {
    if (disabled.has(name)) continue;
    const model =
      getAgentOverride(resolved, name)?.model ??
      DEFAULT_MODELS[name as keyof typeof DEFAULT_MODELS];
    if (!model) continue;

    const agent =
      name === "council"
        ? createCouncilAgent(model)
        : createSpecialistAgent(name, model);

    applyOverride(agent, getAgentOverride(resolved, name));
    applyDefaultPermissions(agent);
    applyAgentClassification(name, agent.config);
    agents[name] = agent;
  }

  if (!disabled.has("councillor")) {
    const councillorModel =
      getAgentOverride(resolved, "councillor")?.model ??
      DEFAULT_MODELS.councillor;
    if (councillorModel) {
      const councillor = createCouncillorAgent(councillorModel);
      applyOverride(councillor, getAgentOverride(resolved, "councillor"));
      applyDefaultPermissions(councillor);
      applyAgentClassification("councillor", councillor.config);
      agents.councillor = councillor;
    }
  }

  return agents;
}

export function getAgentConfigs(
  agents: Record<string, RegisteredAgent>,
): Record<string, SDKAgentConfig> {
  const configs: Record<string, SDKAgentConfig> = {};
  for (const [name, agent] of Object.entries(agents)) {
    configs[name] = {
      ...agent.config,
      description: agent.config.description ?? agent.description,
    };
  }
  return configs;
}

export { ALL_AGENT_NAMES, SUBAGENT_NAMES };
