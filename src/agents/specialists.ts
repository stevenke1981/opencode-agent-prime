import type { AgentConfig } from "@opencode-ai/sdk/v2";

export interface AgentDefinition {
  name: string;
  description: string;
  config: AgentConfig;
}

const SPECIALIST_PROMPTS: Record<string, { role: string; delegate: string }> = {
  explorer: {
    role: "Parallel codebase discovery — glob, grep, map structure",
    delegate: "Unknown scope, parallel searches, need a map before planning",
  },
  librarian: {
    role: "Current library docs and API references via MCP search",
    delegate:
      "External library APIs, version-specific behavior, unfamiliar packages",
  },
  oracle: {
    role: "Architecture review, hard debugging, simplification, trade-offs",
    delegate:
      "High-stakes decisions, 2+ failed fix attempts, code review, YAGNI",
  },
  designer: {
    role: "UI/UX polish — layout, responsive design, visual consistency",
    delegate: "User-facing interfaces where polish and UX matter",
  },
  fixer: {
    role: "Bounded implementation and test edits — fast execution",
    delegate:
      "Well-scoped multi-file implementation, test updates, parallel folder work",
  },
};

export function buildSpecialistBlock(): string {
  return Object.entries(SPECIALIST_PROMPTS)
    .map(([name, info]) => {
      return `@${name}
- Role: ${info.role}
- Delegate when: ${info.delegate}`;
    })
    .join("\n\n");
}

export function createSpecialistAgent(
  name: string,
  model: string,
): AgentDefinition {
  const info = SPECIALIST_PROMPTS[name];
  if (!info) {
    throw new Error(`Unknown specialist: ${name}`);
  }

  return {
    name,
    description: info.role,
    config: {
      model,
      mode: "subagent",
      prompt: `You are ${name}, a specialist subagent for AGENT-PRIME.

${info.role}

Rules:
- Stay within your role; do not expand scope.
- Return concise, actionable results to Orchestrator.
- Prefer tools over speculation; verify before claiming.
- Use Traditional Chinese (zh-TW) in user-facing prose unless asked otherwise.
${name === "explorer" || name === "librarian" || name === "oracle" ? "- READ-ONLY: search and report; do not modify files." : ""}`,
    },
  };
}
