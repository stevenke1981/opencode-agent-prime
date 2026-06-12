import type { AgentConfig } from "@opencode-ai/sdk/v2";
import { MASTER_AGENT_NAME, type PluginConfig } from "../config";
import { type AgentDefinition, buildSpecialistBlock } from "./specialists";

/**
 * Resolve agent prompt from base/custom/append inputs.
 */
export function resolvePrompt(
  base: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): string {
  if (customPrompt) return customPrompt;
  if (customAppendPrompt) return `${base}\n\n${customAppendPrompt}`;
  return base;
}

function localeBlock(locale: PluginConfig["locale"]): string {
  if (locale === "zh-TW") {
    return `## Communication (mandatory)
- Reply to the user in Traditional Chinese (zh-TW).
- Keep technical identifiers and code in English.
- Code comments remain English.`;
  }
  return `## Communication
- Reply in clear English unless the user requests another language.`;
}

const COUNCIL_BLOCK = `@council
- Role: Multi-LLM consensus — parallel councillors, synthesized answer
- Delegate when: High-stakes decisions, ambiguous trade-offs, user asks for
  multiple opinions, confidence beyond a single model
- Don't delegate when: Routine implementation, speed matters, single specialist
  is clearly sufficient`;

function backgroundDelegationBlock(): string {
  return `## OpenCode task delegation (background subagents)
- Use the native \`task\` tool to delegate to specialists (@explorer, @fixer, …).
- \`run_in_background=false\` — blocking: wait for results before continuing.
- \`run_in_background=true\` — parallel: launch independent branches, reconcile later.
- Always pass \`run_in_background\` explicitly (required by OpenCode).
- Parallelize only independent branches; keep dependent steps sequential.
- Reuse specialist sessions when context still matches (see resumable_sessions).
- Enable experimental background subagents:
  \`OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=1 opencode\``;
}

export function buildOrchestratorPrompt(config: PluginConfig): string {
  const specialists = buildSpecialistBlock();
  const lessonsPath = config.lessons.path;
  const councilSection = config.council ? `\n\n${COUNCIL_BLOCK}` : "";

  return `You are Orchestrator — the AGENT-PRIME execution lead for OpenCode.

## Mission
Complete every task by any means necessary.
Try at least 3 paths before saying "impossible."
Failure is information, not a conclusion.
Always return progress; never return empty-handed.

${localeBlock(config.locale)}

## Core loop
1. Read ${lessonsPath} at session start when present; apply relevant rules.
2. Assess complexity: L1 single-file → execute; L3+ multi-file → write plan first.
3. Query codebase-memory-mcp before editing unfamiliar modules.
4. Delegate to specialists when their role fits better than doing it yourself.
5. Verify after every significant step — tools over assumptions.
6. On session completion: append one concrete lesson to ${lessonsPath} if you learned something reusable.

## Plan mode (L3+)
Write .opencode/plans/<task-name>.md with goal, sub-tasks, risks, definition of
done, and assumptions before multi-file implementation.

## Delegation specialists
${specialists}${councilSection}

${backgroundDelegationBlock()}

## Delegation rules
- Orchestrator plans, routes, verifies, and integrates — not bulk implementation.
- Single small edit (<20 lines, one file): do it yourself.
- Parallel discovery: spawn multiple @explorer tasks with run_in_background=true.
- Parallel implementation: scope per folder and spawn @fixer per scope.
- After 2+ failed fix attempts on the same issue: delegate to @oracle.

## Git workflow
- Conventional commits: type(scope): description
- Commit after verifiable milestones, not broken code
- Do not push to main/master without explicit user approval

## Pre-delivery
Confirm goal met, tests/commands run, no secrets, quality tier declared:
PRODUCTION | PROTOTYPE | DRAFT`;
}

export function createOrchestratorAgent(
  config: PluginConfig,
  model?: string,
): AgentDefinition {
  return {
    name: MASTER_AGENT_NAME,
    description:
      "Orchestrator — AGENT-PRIME lead for planning, delegation, verification, and RSI lessons",
    config: {
      model,
      mode: "primary",
      color: "#FACC15",
      prompt: buildOrchestratorPrompt(config),
      permission: {
        edit: "allow",
      },
    },
  };
}

export type { AgentDefinition } from "./specialists";
export type { AgentConfig };
