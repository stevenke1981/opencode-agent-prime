import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { type PluginConfig, PluginConfigSchema } from "./schema";

const CONFIG_FILE = "opencode-agent-prime.json";

function getConfigPaths(directory: string): string[] {
  const configDir =
    process.env.OPENCODE_CONFIG_DIR ?? join(homedir(), ".config", "opencode");
  return [join(directory, CONFIG_FILE), join(configDir, CONFIG_FILE)];
}

export function loadPluginConfig(directory: string): PluginConfig {
  for (const path of getConfigPaths(directory)) {
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
      return PluginConfigSchema.parse(raw);
    } catch {}
  }
  return PluginConfigSchema.parse({});
}

export function getAgentOverride(
  config: PluginConfig,
  agentName: string,
): import("./schema").AgentOverrideConfig | undefined {
  const presetName = config.preset;
  if (presetName && config.presets?.[presetName]?.[agentName]) {
    return config.presets[presetName][agentName];
  }
  return config.agents?.[agentName];
}
