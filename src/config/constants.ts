export const ORCHESTRATOR_NAME = "orchestrator" as const;

export const SUBAGENT_NAMES = [
  "explorer",
  "librarian",
  "oracle",
  "designer",
  "fixer",
] as const;

export const ALL_AGENT_NAMES = [ORCHESTRATOR_NAME, ...SUBAGENT_NAMES] as const;

export type AgentName = (typeof ALL_AGENT_NAMES)[number];

export const ORCHESTRATABLE_AGENTS = [...SUBAGENT_NAMES] as const;

export const DEFAULT_DISABLED_AGENTS = new Set<string>();

export const DEFAULT_MODELS: Record<AgentName, string | undefined> = {
  orchestrator: undefined,
  oracle: "openai/gpt-5.5",
  librarian: "openai/gpt-5.4-mini",
  explorer: "openai/gpt-5.4-mini",
  designer: "openai/gpt-5.4-mini",
  fixer: "openai/gpt-5.4-mini",
};

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
