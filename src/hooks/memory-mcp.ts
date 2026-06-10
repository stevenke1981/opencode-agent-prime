import type { PluginConfig } from "../config";

interface SystemTransformOutput {
  system: string[];
}

export function createMemoryMcpHook(
  config: PluginConfig,
  options?: { getAgentName?: (sessionID: string) => string | undefined },
): {
  "experimental.chat.system.transform": (
    input: { sessionID?: string },
    output: SystemTransformOutput,
  ) => Promise<void>;
} {
  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (!config.memoryMcp.enabled || !config.memoryMcp.remindAtTaskStart) {
        return;
      }
      if (!input.sessionID) return;
      if (options?.getAgentName?.(input.sessionID) !== "orchestrator") {
        return;
      }

      const server = config.memoryMcp.serverName;
      const block = `<memory_mcp_protocol>
Before editing unfamiliar modules, query ${server}:
- search_graph / trace_path / get_code_snippet for architecture and call paths
- index_repository if the repo is not indexed yet
Do not store secrets or temporary details in memory MCP.
</memory_mcp_protocol>`;

      if (
        output.system.some((entry) => entry.includes("<memory_mcp_protocol>"))
      ) {
        return;
      }
      output.system.push(block);
    },
  };
}
