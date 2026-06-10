# opencode-agent-prime

AGENT-PRIME orchestration plugin for [OpenCode](https://opencode.ai). A focused
plugin that implements the workflow from `example/AGENTS.md`: recursive
self-improvement via `lessons.md`, plan-mode discipline, memory MCP reminders,
three-path error recovery, and specialist delegation.

Inspired by [oh-my-opencode-slim](https://github.com/stevenke1981/oh-my-opencode-slim),
but centered on a single orchestrator mindset instead of a large pantheon of
optional subsystems.

## Features

- **AGENT-PRIME orchestrator** — plan, delegate, verify, never return empty-handed
- **`lessons.md` RSI** — inject prior lessons at session start; prompt append on idle
- **Plan mode protocol** — enforce `.opencode/plans/<task>.md` for L3+ work
- **Memory MCP reminders** — nudge `codebase-memory-mcp` graph queries before edits
- **Error recovery escalation** — after repeated tool failures, inject 3-path retry guidance
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
| `opencode-agent-prime.json` | Plugin presets, locale, hooks config |

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
  "lessons": {
    "enabled": true,
    "path": "lessons.md",
    "readAtSessionStart": true,
    "promptAfterIdle": true
  },
  "planMode": {
    "enabled": true,
    "plansDir": ".opencode/plans",
    "minComplexity": "L3"
  },
  "memoryMcp": {
    "enabled": true,
    "serverName": "codebase-memory-mcp",
    "remindAtTaskStart": true
  },
  "errorRecovery": {
    "enabled": true,
    "minAttemptsBeforeEscalate": 3
  },
  "presets": {
    "openai": {
      "orchestrator": { "model": "openai/gpt-5.5" },
      "oracle": { "model": "openai/gpt-5.5", "variant": "high" },
      "librarian": { "model": "openai/gpt-5.4-mini" },
      "explorer": { "model": "openai/gpt-5.4-mini" },
      "designer": { "model": "openai/gpt-5.4-mini" },
      "fixer": { "model": "openai/gpt-5.4-mini" }
    }
  }
}
```

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
  └─ Delegate to @explorer / @oracle / @fixer / … when appropriate

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
| Error handling | Delegate retry | 3-path escalation after failures |
| Locale | English-first | zh-TW default |
| Extra features | Council, tmux, interview, ast-grep, webfetch | Lean core (6 agents, 4 hooks) |

Use **slim** when you need council consensus, terminal multiplexer mirroring, or
the full tool suite. Use **agent-prime** when you want AGENTS.md workflow
discipline with minimal surface area.

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
  index.ts          # Plugin entry
  agents/           # orchestrator + specialists
  hooks/            # lessons RSI, plan mode, memory MCP, error recovery
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

## References

- [OpenCode plugin docs](https://opencode.ai/docs/plugins/)
- [OpenCode ecosystem](https://opencode.ai/docs/ecosystem/)
- [oh-my-opencode-slim](https://github.com/stevenke1981/oh-my-opencode-slim)

## License

MIT