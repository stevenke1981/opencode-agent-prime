# opencode-agent-prime

AGENT-PRIME is an [OpenCode](https://opencode.ai) orchestration plugin. It
installs a focused team of agents, a conservative OpenCode config merge flow,
and the workflow discipline from `example/AGENTS.md`: lessons, planning,
graph-first code discovery, specialist delegation, error recovery, ast-grep,
web fetch, and optional multi-model council review.

This project was shaped after studying
[alvinunreal/oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim),
but it is intentionally smaller and opinionated around the AGENT-PRIME workflow.

## For Humans

Use this plugin when you want OpenCode to start with a strong primary
orchestrator and a small specialist bench instead of the default general-purpose
agent set.

### What You Get

| Area | Included behavior |
| --- | --- |
| Primary agent | `orchestrator`, the AGENT-PRIME coordinator |
| Specialists | `explorer`, `librarian`, `oracle`, `designer`, `fixer` |
| Optional review | `council` plus hidden `councillor` workers |
| Tools | `ast_grep_search`, `ast_grep_replace`, `webfetch`, `council_session` |
| Memory | prompts agents to prefer `codebase-memory-mcp` for code discovery |
| Planning | requires `.opencode/plans/<task>.md` for L3+ work |
| Recovery | injects three-path retry guidance after repeated failures |
| Locale | Traditional Chinese user-facing responses by default |

### Install From npm

After the package is published:

```bash
npx opencode-agent-prime install
```

### Install From This Repository

```bash
git clone https://github.com/stevenke1981/opencode-agent-prime.git
cd opencode-agent-prime
npm install
npm run build
npx opencode-agent-prime install
```

The installer writes to `~/.config/opencode`, or to `$OPENCODE_CONFIG_DIR` when
that environment variable is set.

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Global AGENT-PRIME operating rules copied from `example/AGENTS.md` |
| `opencode.jsonc` | OpenCode host config with this plugin, MCP, disabled defaults, and LSP |
| `opencode-agent-prime.json` | Plugin presets, locale, hook settings, council settings |

Preview the host config merge before writing anything:

```bash
npx opencode-agent-prime install --dry-run
```

Use `--overwrite` only when you want to replace existing generated files. The
installer backs up replaced files with `.bak`.

### Verify The Install

```bash
opencode auth login
opencode models --refresh
opencode
```

Inside OpenCode:

```text
ping all agents
```

For parallel background delegation, start OpenCode with:

```bash
OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=1 opencode
```

### Configure Models

Edit:

```text
~/.config/opencode/opencode-agent-prime.json
```

Minimal example:

```jsonc
{
  "$schema": "https://unpkg.com/opencode-agent-prime@latest/opencode-agent-prime.schema.json",
  "preset": "openai",
  "locale": "zh-TW",
  "presets": {
    "openai": {
      "orchestrator": { "model": "openai/gpt-5.5" },
      "oracle": { "model": "openai/gpt-5.5", "variant": "high" },
      "librarian": { "model": "openai/gpt-5.4-mini", "variant": "low" },
      "explorer": { "model": "openai/gpt-5.4-mini", "variant": "low" },
      "designer": { "model": "openai/gpt-5.4-mini", "variant": "medium" },
      "fixer": { "model": "openai/gpt-5.4-mini", "variant": "low" }
    }
  }
}
```

Enable council only when you have usable councillor models:

```jsonc
{
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
  }
}
```

See `example/opencode-agent-prime.json` for the full starter config and
`opencode-agent-prime.schema.json` for the generated JSON Schema.

## For Agents

This repository is a TypeScript OpenCode plugin. Prefer codebase-memory MCP
graph tools for code discovery, then fall back to `rg` for strings, configs, and
non-code files.

### Entry Points

| Path | Role |
| --- | --- |
| `src/index.ts` | OpenCode plugin entry; registers tools, agents, hooks, and config transform |
| `src/agents/` | Agent definitions and prompt builders |
| `src/hooks/` | Lessons RSI, plan mode, memory MCP, error recovery, task session manager |
| `src/tools/` | ast-grep, smartfetch/webfetch, and council tool implementations |
| `src/config/` | Zod config schemas, defaults, loader, and constants |
| `src/cli/` | Installer, config merge logic, path helpers |
| `example/` | Files copied into the user's OpenCode config directory |
| `scripts/generate-schema.ts` | Regenerates `opencode-agent-prime.schema.json` |

### Maintenance Rules

- Keep the plugin lean. Do not import the full `oh-my-opencode-slim` subsystem
  surface unless there is a concrete AGENT-PRIME use case.
- Preserve existing OpenCode user config when editing installer behavior.
  `src/cli/install.ts` should merge rather than clobber unrelated plugins, MCPs,
  agents, and `lsp`.
- Keep `example/AGENTS.md`, README behavior, schema, and installer output in
  agreement.
- Regenerate `opencode-agent-prime.schema.json` through `npm run build` after
  schema changes.
- Do not assume `dist/` is committed. It is ignored, but `npm pack` includes the
  built files from the working tree.
- Add focused tests for installer/config/prompt behavior before touching shared
  orchestration paths.

### Validation Gates

Run these before committing:

```bash
npm run check:ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

Useful smoke test:

```bash
node ./dist/cli/index.js install --dry-run
```

Expected behavior from the smoke test:

- no files are written
- local checkout installs preview as the package root path
- npm or `npx` installs preview as `opencode-agent-prime`
- unrelated existing OpenCode config fields remain present

### Release Checklist

1. Update `version` in `package.json`.
2. Run all validation gates.
3. Confirm `npm pack --dry-run` includes `dist`, `example`, schema, README, and
   LICENSE.
4. Commit source, schema, tests, and docs.
5. Publish only after testing install behavior against a disposable
   `OPENCODE_CONFIG_DIR`.

## How It Works

```text
Session start
  - load opencode-agent-prime.json
  - register AGENT-PRIME agents
  - inject lessons, planning, memory MCP, and recovery guidance
  - disable OpenCode built-in build/explore/general/plan agents

Task execution
  - L1/L2 work stays with orchestrator
  - L3+ work gets a file-backed plan
  - specialist work is delegated through task()
  - task sessions are reused when context still matches

Council flow
  - @council or council_session creates councillor sessions
  - results are gathered and synthesized
  - council_session is denied to non-council agents by default
```

## Comparison With oh-my-opencode-slim

| Area | oh-my-opencode-slim | opencode-agent-prime |
| --- | --- | --- |
| Identity | Multi-agent pantheon | AGENT-PRIME orchestrator plus lean specialists |
| Learning | Evolution log and evolver | `lessons.md` RSI |
| Planning | Phase reminders | `.opencode/plans/` protocol |
| Memory MCP | Configurable | Task-start reminder |
| Error handling | Delegate retry | Three-path escalation plus delegate retry |
| Locale | English-first | zh-TW default |
| Extra subsystems | tmux, interview, divoom, TUI | Not included |

Use `oh-my-opencode-slim` when you want its full ecosystem. Use
`opencode-agent-prime` when you want a smaller AGENTS.md-driven workflow with
structural code search, webfetch, background delegation, and optional council.

## Requirements

- OpenCode with plugin support
- Node.js 20+
- Bun available for build/test commands
- Optional: `codebase-memory-mcp`
- Optional: `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=1` for parallel tasks

## License

MIT
