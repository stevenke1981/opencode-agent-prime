import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function getConfigDir(): string {
  const custom = process.env.OPENCODE_CONFIG_DIR?.trim();
  if (custom) return custom;
  const xdg = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(xdg, "opencode");
}

export function getPluginConfigPath(): string {
  return join(getConfigDir(), "opencode-agent-prime.json");
}

export function getOpenCodeConfigJsonc(): string {
  return join(getConfigDir(), "opencode.jsonc");
}

export function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
