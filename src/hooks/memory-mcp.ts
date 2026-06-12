import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { isMasterAgentName, type PluginConfig } from "../config";

const asyncExecFile = promisify(execFile);
const injectedSessions = new Set<string>();

interface SystemTransformOutput {
  system: string[];
}

/**
 * Try to locate the cbrlm binary in known install locations or PATH.
 */
function findCbrlmBinary(): string | null {
  // Known install paths (Windows)
  const candidates = [
    join(homedir(), ".config", "opencode-cbrlm", "bin", "cbrlm.new.exe"),
    join(homedir(), ".config", "opencode-cbrlm", "bin", "cbrlm.exe"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // Check PATH
  const pathDirs = (process.env.PATH ?? "").split(";");
  for (const dir of pathDirs) {
    for (const name of ["cbrlm", "cbrlm.exe"]) {
      const p = join(dir.trim(), name);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * Run `cbrlm hook-session-start` in the given directory, with a timeout.
 * Returns stdout on success, null on any failure.
 */
async function runCbrlmSessionHook(
  cwd: string,
  timeoutMs = 5000,
): Promise<string | null> {
  const binary = findCbrlmBinary();
  if (!binary) return null;
  try {
    const { stdout } = await asyncExecFile(binary, ["hook-session-start"], {
      cwd,
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 16 * 1024,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export function createMemoryMcpHook(
  config: PluginConfig,
  options?: {
    getAgentName?: (sessionID: string) => string | undefined;
    directory?: string;
  },
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
      if (!isMasterAgentName(options?.getAgentName?.(input.sessionID))) {
        return;
      }

      // --- Inject graph context from cbrlm hook (once per session) ---
      if (!injectedSessions.has(input.sessionID)) {
        injectedSessions.add(input.sessionID);

        const cwd = options?.directory ?? process.cwd();
        const hookOutput = await runCbrlmSessionHook(cwd);

        if (hookOutput) {
          // Wrap in XML-ish context block the agent can parse
          const ctxBlock = `<cbrlm_context>
${hookOutput}
</cbrlm_context>`;
          if (
            !output.system.some((entry) =>
              entry.includes("<cbrlm_context>"),
            )
          ) {
            output.system.push(ctxBlock);
          }
        }
      }

      // --- Always inject the generic memory MCP protocol as fallback / reference ---
      const server = config.memoryMcp.serverName;
      const block = `<memory_mcp_protocol>
Before editing unfamiliar modules, query ${server}:
- search_graph / trace_path / get_code_snippet for architecture and call paths
- index_repository if the repo is not indexed yet
Do not store secrets or temporary details in memory MCP.
</memory_mcp_protocol>`;

      if (
        !output.system.some((entry) =>
          entry.includes("<memory_mcp_protocol>"),
        )
      ) {
        output.system.push(block);
      }
    },
  };
}
