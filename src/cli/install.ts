import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureConfigDir,
  getConfigDir,
  getOpenCodeConfigJsonc,
  getPluginConfigPath,
} from "./paths";

const EXAMPLE_FILES = ["AGENTS.md", "opencode.jsonc"] as const;

export interface InstallResult {
  success: boolean;
  configDir: string;
  message: string;
}

function packageRoot(): string {
  return fileURLToPath(new URL("../..", import.meta.url));
}

function backupIfExists(path: string): void {
  if (!existsSync(path)) return;
  const backup = `${path}.bak`;
  rmSync(backup, { force: true });
  renameSync(path, backup);
}

function copyWithBackup(
  source: string,
  target: string,
  overwrite: boolean,
): void {
  if (existsSync(target)) {
    if (!overwrite) return;
    backupIfExists(target);
  }
  copyFileSync(source, target);
}

function mergePluginIntoOpenCodeConfig(overwrite: boolean): void {
  const configPath = getOpenCodeConfigJsonc();
  const examplePath = join(packageRoot(), "example", "opencode.jsonc");
  if (!existsSync(examplePath)) return;

  if (!existsSync(configPath) || overwrite) {
    if (existsSync(configPath) && overwrite) backupIfExists(configPath);
    copyFileSync(examplePath, configPath);
    return;
  }

  try {
    const raw = readFileSync(configPath, "utf8");
    const withoutComments = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const parsed = JSON.parse(withoutComments) as {
      plugin?: string[];
    };
    const plugins = new Set(parsed.plugin ?? []);
    plugins.add("opencode-agent-prime");
    parsed.plugin = [...plugins];
    writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`);
  } catch {
    copyWithBackup(examplePath, configPath, false);
  }
}

export function installAgentPrime(options?: {
  overwrite?: boolean;
}): InstallResult {
  const overwrite = options?.overwrite ?? false;
  const configDir = getConfigDir();
  const exampleDir = join(packageRoot(), "example");

  try {
    ensureConfigDir();

    for (const fileName of EXAMPLE_FILES) {
      copyWithBackup(
        join(exampleDir, fileName),
        join(configDir, fileName),
        overwrite,
      );
    }

    const pluginExample = join(exampleDir, "opencode-agent-prime.json");
    const pluginTarget = getPluginConfigPath();
    copyWithBackup(pluginExample, pluginTarget, overwrite);

    mergePluginIntoOpenCodeConfig(overwrite);

    mkdirSync(join(dirname(getOpenCodeConfigJsonc()), "plugins"), {
      recursive: true,
    });

    return {
      success: true,
      configDir,
      message:
        "Installed AGENTS.md, opencode.jsonc, and opencode-agent-prime.json",
    };
  } catch (err) {
    return {
      success: false,
      configDir,
      message: `Install failed: ${String(err)}`,
    };
  }
}
