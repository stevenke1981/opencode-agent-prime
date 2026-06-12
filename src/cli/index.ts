#!/usr/bin/env node
import { installAgentPrime } from "./install";

const args = process.argv.slice(2);
const overwrite = args.includes("--overwrite") || args.includes("-f");
const dryRun = args.includes("--dry-run");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`opencode-agent-prime installer

Usage:
  opencode-agent-prime install [--overwrite] [--dry-run]

Writes to ~/.config/opencode (or OPENCODE_CONFIG_DIR):
  - AGENTS.md
  - opencode.jsonc
  - opencode-agent-prime.json
  - plugins/opencode-agent-prime.js when installing from a local checkout
`);
  process.exit(0);
}

const command = args[0] ?? "install";

if (command !== "install") {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

const result = installAgentPrime({ dryRun, overwrite });
if (!result.success) {
  console.error(result.message);
  process.exit(1);
}

console.log(`> ${result.message}`);
console.log(`> Config directory: ${result.configDir}`);
if (result.pluginEntry) {
  console.log(`> OpenCode npm plugin entry: ${result.pluginEntry}`);
}
if (result.pluginShimPath) {
  console.log(`> OpenCode local plugin shim: ${result.pluginShimPath}`);
}
if (result.dryRunConfig) {
  console.log("> Merged opencode.jsonc preview:");
  console.log(JSON.stringify(result.dryRunConfig, null, 2));
} else {
  console.log("> Start OpenCode: opencode");
}
