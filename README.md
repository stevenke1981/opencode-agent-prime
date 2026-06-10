# opencode-agent-prime

AGENT-PRIME orchestration plugin for [OpenCode](https://opencode.ai). A focused
plugin that implements the workflow from `example/AGENTS.md`: recursive
self-improvement via `lessons.md`, plan-mode discipline, memory MCP reminders,
three-path error recovery, specialist delegation, and the high-value tool suite
from [oh-my-opencode-slim](https://github.com/stevenke1981/oh-my-opencode-slim).

## Features

- **AGENT-PRIME orchestrator** — plan, delegate, verify, never return empty-handed
- **`lessons.md` RSI** — inject prior lessons at session start; prompt append on idle
- **Plan mode protocol** — enforce `.opencode/plans/<task>.md` for L3+ work
- **Memory MCP reminders** — nudge `codebase-memory-mcp` graph queries before edits
- **Error recovery escalation** — after repeated tool failures, inject 3-path retry guidance
- **Background subagent delegation** — native `task` tool with `run_in_background` + session reuse
- **ast-grep tools** — `ast_grep_search` / `ast_grep_replace` for structural code queries
- **webfetch** — fetch URLs, extract readable content (requires jsdom)
- **Multi-LLM council** — `@council` agent + `council_session` tool for consensus
- **zh-TW by default** — Traditional Chinese user-facing prose per AGENTS.md §8
- **Built-in agents disabled** — OpenCode `build` / `explore` / `general` / `plan` off by default

## Specialist agents

| Agent | Role |
|-------|------|
| `orchestrator` | AGENT-PRIME — routing, verification, git, RSI |
| `explorer` | Codebase discovery (glob, grep, structure maps) |
| `librarian` | Library docs and API references |
| `oracle` | Architecture review, hard debugging, simplification |
| `designer` | UI/UX polish and responsive layout |
| `fixer` | Bounded implementation and test edits |
| `council` | Multi-LLM consensus (when `council` config is present) |

## Tools

| Tool | Purpose |
|------|---------|
| `ast_grep_search` | AST pattern search across the codebase |
| `ast_grep_replace` | AST-aware structural replacements |
| `webfetch` | Fetch and summarize web pages |
| `council_session` | Run councillor presets (council agent only) |

## Quick install

### From npm (after publish)

```bash
npx opencode-agent-prime install
```

### From source

```bash
git clone https://github.com/stevenke1981/opencode-agent-prime.git
cd opencode-agent-prime
npm install
npm run build
npx opencode-agent-prime install
```

The installer writes into `~/.config/opencode` (or `$OPENCODE_CONFIG_DIR`):

| File | Purpose |
|------|---------|
| `AGENTS.md` | Global AGENT-PRIME operating rules |
| `opencode.jsonc` | OpenCode config with plugin + MCP enabled |
| `opencode-agent-prime.json` | Plugin presets, locale, hooks, council config |

### Background subagents

For parallel non-blocking delegation, enable OpenCode's experimental flag:

```bash
OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=1 opencode
```

The orchestrator prompt documents `run_in_background=false` (blocking) vs
`run_in_background=true` (parallel). The delegate-task-retry hook appends
guidance when `run_in_background` is missing from `task` calls.

### Local development

Point OpenCode at your build output:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/opencode-agent-prime/dist/index.js"],
  "mcp": {
    "codebase-memory-mcp": {
      "command": "codebase-memory-mcp",
      "args": [],
      "enabled": true
    }
  }
}
```

Then run `opencode` from your project directory.

## Configuration

Plugin config path: `~/.config/opencode/opencode-agent-prime.json`

```jsonc
{
  "$schema": "https://unpkg.com/opencode-agent-prime@latest/opencode-agent-prime.schema.json",
  "preset": "openai",
  "locale": "zh-TW",
  "sessionManager": {
    "maxSessionsPerAgent": 2,
    "readContextMinLines": 10,
    "readContextMaxFiles": 8
  },
  "council": {
    "presets": {
      "default": {
        "alpha": { "model": "openai/gpt-5.4-mini" },
        "beta": { "model": "openai/gpt-5.3-codex" },
        "gamma": { "model": "google/gemini-3-pro" }
      }
    },
    "default_preset": "default",
    "timeout": 180000,
    "councillor_execution_mode": "serial"
  },
  "presets": {
    "openai": {
      "orchestrator": { "model": "openai/gpt-5.5" },
      "council": { "model": "openai/gpt-5.4-mini" }
    }
  }
}
```

Council is only registered when `council.presets` is configured. Replace model
IDs with providers you have access to.

See `example/opencode-agent-prime.json` for a full starter file and
`opencode-agent-prime.schema.json` for the JSON Schema.

## How it works

```
Session start
  ├─ Read lessons.md → inject into orchestrator system prompt
  ├─ Inject plan-mode + memory MCP + error-recovery protocols
  └─ Disable OpenCode built-in agents (orchestrator owns routing)

Task execution
  ├─ L1/L2 → orchestrator executes directly
  ├─ L3+  → write .opencode/plans/<task>.md first
  ├─ Delegate via task(subagent_type, run_in_background=…)
  └─ Reuse specialist sessions when context still matches

Council (@council or orchestrator delegation)
  └─ council_session → parallel councillors → synthesized report

Session idle
  └─ Prompt orchestrator to append a reusable lesson to lessons.md
```

## Comparison with oh-my-opencode-slim

| Area | oh-my-opencode-slim | opencode-agent-prime |
|------|---------------------|----------------------|
| Identity | Multi-agent pantheon | AGENT-PRIME single orchestrator |
| Learning | `evolution-log.md` + @evolver | `lessons.md` append-only RSI |
| Plan workflow | Phase reminders | `.opencode/plans/` protocol hook |
| Memory MCP | Configurable | Auto-reminder at task start |
| Error handling | Delegate retry | 3-path escalation + delegate retry |
| Locale | English-first | zh-TW default |
| ast-grep / webfetch / council | Yes | Yes (ported) |
| tmux / interview / divoom | Yes | Not included (lean core) |

Use **slim** when you need terminal multiplexer mirroring, interview mode, or
the full optional subsystem surface. Use **agent-prime** when you want AGENTS.md
workflow discipline with ast-grep, webfetch, background delegation, and council.

## Development

```bash
npm run check:ci   # lint + format
npm run typecheck  # TypeScript
npm test           # bun test
npm run build      # dist/ + schema
```

Project layout:

```
src/
  index.ts          # Plugin entry (tools + hooks)
  agents/           # orchestrator, specialists, council
  council/          # CouncilManager
  hooks/            # lessons RSI, plan mode, memory MCP, error recovery,
                    # delegate-task-retry, task-session-manager
  tools/            # ast-grep, webfetch, council_session
  config/           # Zod schema + loader
  cli/              # install command
example/
  AGENTS.md         # Global agent rules (installed to ~/.config/opencode)
  opencode.jsonc    # OpenCode host config template
```

## Requirements

- [OpenCode](https://opencode.ai) with plugin support
- Node.js 20+ (Bun used for build/test)
- Optional: [codebase-memory-mcp](https://github.com) for graph-based code discovery
- Optional: `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=1` for parallel background tasks

## References

- [OpenCode plugin docs](https://opencode.ai/docs/plugins/)
- [OpenCode ecosystem](https://opencode.ai/docs/ecosystem/)
- [oh-my-opencode-slim](https://github.com/stevenke1981/oh-my-opencode-slim)

## License

MIT