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
import { stripJsonComments } from "./config-io";
import {
  ensureConfigDir,
  getConfigDir,
  getOpenCodeConfigJsonc,
  getPluginConfigPath,
} from "./paths";

const EXAMPLE_FILES = ["AGENTS.md"] as const;
const PACKAGE_NAME = "opencode-agent-prime";
const DEFAULT_OPENCODE_AGENTS_TO_DISABLE = [
  "build",
  "explore",
  "general",
  "plan",
] as const;

type OpenCodeConfig = {
  plugin?: unknown[];
  agent?: Record<string, unknown>;
  lsp?: boolean;
  [key: string]: unknown;
};

export interface InstallResult {
  success: boolean;
  configDir: string;
  message: string;
  dryRunConfig?: OpenCodeConfig;
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

function readPackageName(root: string): string | undefined {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as { name?: string };
    return packageJson.name;
  } catch {
    return undefined;
  }
}

function findPackageRoot(startPath: string): string {
  let current = dirname(startPath);
  while (true) {
    if (readPackageName(current) === PACKAGE_NAME) return current;
    const parent = dirname(current);
    if (parent === current) return packageRoot();
    current = parent;
  }
}

function normalizePathForMatch(path: string): string {
  return path.replaceAll("\\", "/");
}

function isPackageManagerInstall(root: string): boolean {
  return normalizePathForMatch(root).includes(`/node_modules/${PACKAGE_NAME}`);
}

function getPluginSpec(entry: unknown): string | undefined {
  if (typeof entry === "string") return entry;
  if (!Array.isArray(entry)) return undefined;
  const spec = entry[0];
  return typeof spec === "string" ? spec : undefined;
}

function isPluginEntry(entry: unknown): boolean {
  const spec = getPluginSpec(entry);
  if (!spec) return false;
  if (spec === PACKAGE_NAME || spec.startsWith(`${PACKAGE_NAME}@`)) {
    return true;
  }
  if (spec.startsWith("file://") && spec.includes(PACKAGE_NAME)) return true;
  return readPackageName(spec) === PACKAGE_NAME;
}

export function getPluginEntry(cliEntryPath = process.argv[1]): string {
  if (!cliEntryPath) return PACKAGE_NAME;
  const root = findPackageRoot(cliEntryPath);
  return isPackageManagerInstall(root) ? PACKAGE_NAME : root;
}

export function parseOpenCodeConfig(raw: string): OpenCodeConfig {
  return JSON.parse(stripJsonComments(raw)) as OpenCodeConfig;
}

export function mergeOpenCodeConfig(
  existing: OpenCodeConfig,
  pluginEntry = getPluginEntry(),
): OpenCodeConfig {
  const plugins = Array.isArray(existing.plugin) ? existing.plugin : [];
  const filteredPlugins = plugins.filter((entry) => !isPluginEntry(entry));
  filteredPlugins.unshift(pluginEntry);

  const agent = {
    ...(existing.agent ?? {}),
  };
  for (const agentName of DEFAULT_OPENCODE_AGENTS_TO_DISABLE) {
    const current = agent[agentName];
    agent[agentName] = {
      ...(current && typeof current === "object" && !Array.isArray(current)
        ? current
        : {}),
      disable: true,
    };
  }

  return {
    ...existing,
    plugin: filteredPlugins,
    agent,
    lsp: existing.lsp ?? true,
  };
}

function readExistingOpenCodeConfig(configPath: string): OpenCodeConfig {
  if (!existsSync(configPath)) return {};
  return parseOpenCodeConfig(readFileSync(configPath, "utf8"));
}

function writeOpenCodeConfig(configPath: string, config: OpenCodeConfig): void {
  if (existsSync(configPath)) backupIfExists(configPath);
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function mergePluginIntoOpenCodeConfig(overwrite: boolean): OpenCodeConfig {
  const configPath = getOpenCodeConfigJsonc();
  const examplePath = join(packageRoot(), "example", "opencode.jsonc");

  if (!existsSync(configPath) || overwrite) {
    if (existsSync(configPath) && overwrite) backupIfExists(configPath);
    const config = mergeOpenCodeConfig(readExistingOpenCodeConfig(examplePath));
    writeOpenCodeConfig(configPath, config);
    return config;
  }

  const config = mergeOpenCodeConfig(readExistingOpenCodeConfig(configPath));
  writeOpenCodeConfig(configPath, config);
  return config;
}

export function installAgentPrime(options?: {
  overwrite?: boolean;
  dryRun?: boolean;
}): InstallResult {
  const overwrite = options?.overwrite ?? false;
  const dryRun = options?.dryRun ?? false;
  const configDir = getConfigDir();
  const exampleDir = join(packageRoot(), "example");

  try {
    if (dryRun) {
      const configPath = getOpenCodeConfigJsonc();
      const dryRunConfig = !overwrite
        ? mergeOpenCodeConfig(readExistingOpenCodeConfig(configPath))
        : mergeOpenCodeConfig(
            readExistingOpenCodeConfig(join(exampleDir, "opencode.jsonc")),
          );
      return {
        success: true,
        configDir,
        dryRunConfig,
        message: "Dry run complete; no files were written",
      };
    }

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
