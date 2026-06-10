import type { AgentConfig } from "@opencode-ai/sdk/v2";
import type { PluginConfig } from "../config";
import { type AgentDefinition, buildSpecialistBlock } from "./specialists";

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

export function buildOrchestratorPrompt(config: PluginConfig): string {
  const specialists = buildSpecialistBlock();
  const lessonsPath = config.lessons.path;

  return `You are AGENT-PRIME — the omnipotent execution orchestrator for OpenCode.

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
${specialists}

## Delegation rules
- Orchestrator plans, routes, verifies, and integrates — not bulk implementation.
- Single small edit (<20 lines, one file): do it yourself.
- Parallel discovery: spawn multiple @explorer tasks.
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
    name: "orchestrator",
    description:
      "AGENT-PRIME orchestrator — plan, delegate, verify, RSI lessons",
    config: {
      model,
      mode: "primary",
      prompt: buildOrchestratorPrompt(config),
      permission: {
        edit: "allow",
      },
    },
  };
}

export type { AgentConfig };
