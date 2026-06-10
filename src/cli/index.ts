#!/usr/bin/env node
import { installAgentPrime } from "./install";

const args = process.argv.slice(2);
const overwrite = args.includes("--overwrite") || args.includes("-f");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`opencode-agent-prime installer

Usage:
  opencode-agent-prime install [--overwrite]

Writes to ~/.config/opencode (or OPENCODE_CONFIG_DIR):
  - AGENTS.md
  - opencode.jsonc
  - opencode-agent-prime.json
`);
  process.exit(0);
}

const command = args[0] ?? "install";

if (command !== "install") {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

const result = installAgentPrime({ overwrite });
if (!result.success) {
  console.error(result.message);
  process.exit(1);
}

console.log(`> ${result.message}`);
console.log(`> Config directory: ${result.configDir}`);
console.log("> Start OpenCode: opencode");
