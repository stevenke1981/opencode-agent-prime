export const ORCHESTRATOR_NAME = "orchestrator" as const;
export const LEGACY_MASTER_AGENT_NAME = "mastermind" as const;
export const MASTER_AGENT_NAME = ORCHESTRATOR_NAME;

export const SUBAGENT_NAMES = [
  "explorer",
  "librarian",
  "oracle",
  "designer",
  "fixer",
  "council",
  "councillor",
] as const;

export const ALL_AGENT_NAMES = [
  MASTER_AGENT_NAME,
  LEGACY_MASTER_AGENT_NAME,
  ...SUBAGENT_NAMES,
] as const;

export type AgentName = (typeof ALL_AGENT_NAMES)[number];

export const ORCHESTRATABLE_AGENTS = [
  "explorer",
  "librarian",
  "oracle",
  "designer",
  "fixer",
  "council",
] as const;

/** Agents that cannot be disabled even if listed in disabled_agents config. */
export const PROTECTED_AGENTS = new Set<string>([
  MASTER_AGENT_NAME,
  LEGACY_MASTER_AGENT_NAME,
  "councillor",
]);

export const DEFAULT_DISABLED_AGENTS = new Set<string>();

export const DEFAULT_MODELS: Record<AgentName, string | undefined> = {
  mastermind: undefined,
  orchestrator: undefined,
  oracle: "openai/gpt-5.5",
  librarian: "openai/gpt-5.4-mini",
  explorer: "openai/gpt-5.4-mini",
  designer: "openai/gpt-5.4-mini",
  fixer: "openai/gpt-5.4-mini",
  council: "openai/gpt-5.4-mini",
  councillor: "openai/gpt-5.4-mini",
};

export const POLL_INTERVAL_MS = 500;
export const POLL_INTERVAL_SLOW_MS = 1000;
export const POLL_INTERVAL_BACKGROUND_MS = 2000;

export const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;
export const MAX_POLL_TIME_MS = 5 * 60 * 1000;

export const DEFAULT_MAX_SUBAGENT_DEPTH = 3;

export const TMUX_SPAWN_DELAY_MS = 500;
export const COUNCILLOR_STAGGER_MS = 250;

export const STABLE_POLLS_THRESHOLD = 3;

export const PLAN_MODE_REMINDER = `<plan_mode_protocol>
Complex tasks (L3+: multi-file, architectural impact) require a plan file at
.opencode/plans/<task-name>.md before implementation. Include goal, sub-tasks,
risks, definition of done, and assumptions. Switch to Build mode only after the
plan is written.
</plan_mode_protocol>`;

export const ERROR_RECOVERY_REMINDER = `<error_recovery_protocol>
Never conclude "impossible" before trying 3+ distinct paths. Record each
failure, escalate fix strategy, and re-examine assumptions on attempt 3. Deliver
partial progress with stated limits rather than empty-handed.
</error_recovery_protocol>`;

export const PRE_DELIVERY_CHECKLIST = `<pre_delivery_review>
Before delivery confirm: primary goal achieved, edge cases handled, commands
actually executed and verified, no secrets leaked, plan/spec satisfied. Declare
quality: PRODUCTION | PROTOTYPE | DRAFT.
</pre_delivery_review>`;

export function isMasterAgentName(agentName: string | undefined): boolean {
  return (
    agentName === MASTER_AGENT_NAME || agentName === LEGACY_MASTER_AGENT_NAME
  );
}
