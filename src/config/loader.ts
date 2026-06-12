import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { LEGACY_MASTER_AGENT_NAME, MASTER_AGENT_NAME } from "./constants";
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
  const candidateNames =
    agentName === MASTER_AGENT_NAME
      ? [MASTER_AGENT_NAME, LEGACY_MASTER_AGENT_NAME]
      : agentName === LEGACY_MASTER_AGENT_NAME
        ? [LEGACY_MASTER_AGENT_NAME, MASTER_AGENT_NAME]
        : [agentName];
  const presetName = config.preset;
  if (presetName) {
    for (const candidateName of candidateNames) {
      const override = config.presets?.[presetName]?.[candidateName];
      if (override) return override;
    }
  }
  for (const candidateName of candidateNames) {
    const override = config.agents?.[candidateName];
    if (override) {
      return override;
    }
  }
  return undefined;
}
