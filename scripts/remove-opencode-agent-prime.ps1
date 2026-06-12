param(
  [string]$ConfigDir,
  [switch]$DryRun,
  [switch]$Delete,
  [switch]$RemoveAgents
)

$ErrorActionPreference = "Stop"

function Get-DefaultConfigDir {
  if ($env:OPENCODE_CONFIG_DIR -and $env:OPENCODE_CONFIG_DIR.Trim()) {
    return $env:OPENCODE_CONFIG_DIR.Trim()
  }

  $xdg = $env:XDG_CONFIG_HOME
  if (-not $xdg) {
    $xdg = Join-Path $HOME ".config"
  }
  return Join-Path $xdg "opencode"
}

function Write-Action {
  param([string]$Message)
  Write-Host "> $Message"
}

if (-not $ConfigDir) {
  $ConfigDir = Get-DefaultConfigDir
}

$ConfigDir = [System.IO.Path]::GetFullPath($ConfigDir)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $ConfigDir "_removed\opencode-agent-prime-$timestamp"

function New-BackupPath {
  param([string]$Path)
  $base = [System.IO.Path]::GetFullPath($ConfigDir).TrimEnd("\", "/")
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $prefix = "$base\"
  if ($fullPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    $relative = $fullPath.Substring($prefix.Length)
  } else {
    $relative = Split-Path -Leaf $fullPath
  }
  return Join-Path $backupRoot $relative
}

function Backup-FileCopy {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }
  if ($DryRun) {
    Write-Action "Would back up $Path"
    return
  }

  $target = New-BackupPath $Path
  $targetDir = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  Copy-Item -LiteralPath $Path -Destination $target -Force
  Write-Action "Backed up $Path to $target"
}

function Remove-InstalledPath {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    Write-Action "Already absent: $Path"
    return
  }

  if ($DryRun) {
    if ($Delete) {
      Write-Action "Would permanently delete $Path"
    } else {
      Write-Action "Would move $Path to $backupRoot"
    }
    return
  }

  if ($Delete) {
    Remove-Item -LiteralPath $Path -Force
    Write-Action "Deleted $Path"
    return
  }

  $target = New-BackupPath $Path
  $targetDir = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  Move-Item -LiteralPath $Path -Destination $target -Force
  Write-Action "Moved $Path to $target"
}

function Remove-EmptyDirectory {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
    return
  }
  $children = Get-ChildItem -LiteralPath $Path -Force
  if ($children.Count -gt 0) {
    return
  }
  if ($DryRun) {
    Write-Action "Would remove empty directory $Path"
    return
  }
  Remove-Item -LiteralPath $Path -Force
  Write-Action "Removed empty directory $Path"
}

function Update-OpenCodeConfig {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    Write-Action "Already absent: $Path"
    return
  }

  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Action "Node.js not found; leaving $Path unchanged"
    return
  }

  if (-not $DryRun) {
    Backup-FileCopy $Path
  }

  $nodeScript = @'
const fs = require("fs");
const path = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
const pkg = "opencode-agent-prime";
const builtinAgents = ["build", "explore", "general", "plan"];

function stripJsonComments(json) {
  const commentPattern = /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g;
  const trailingCommaPattern = /\\"|"(?:\\"|[^"])*"|(,)(\s*[}\]])/g;
  return json
    .replace(commentPattern, (match, commentGroup) => commentGroup ? "" : match)
    .replace(trailingCommaPattern, (match, comma, closing) => comma ? closing : match);
}

function pluginSpec(entry) {
  if (typeof entry === "string") return entry;
  if (Array.isArray(entry) && typeof entry[0] === "string") return entry[0];
  return undefined;
}

function isAgentPrimePlugin(entry) {
  const spec = pluginSpec(entry);
  if (spec === undefined) return false;
  const trimmed = spec.trim();
  return trimmed === "" ||
    trimmed === pkg ||
    trimmed.startsWith(`${pkg}@`) ||
    (trimmed.startsWith("file://") && trimmed.includes(pkg)) ||
    trimmed.replaceAll("\\", "/").includes(`/${pkg}`);
}

function isDisableOnlyAgent(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.disable === true &&
    Object.keys(value).length === 1;
}

const raw = fs.readFileSync(path, "utf8");
const config = JSON.parse(stripJsonComments(raw));
let changed = false;

if (Array.isArray(config.plugin)) {
  const nextPlugins = config.plugin.filter((entry) => !isAgentPrimePlugin(entry));
  changed = changed || nextPlugins.length !== config.plugin.length;
  config.plugin = nextPlugins;
}

if (config.agent && typeof config.agent === "object" && !Array.isArray(config.agent)) {
  for (const name of builtinAgents) {
    if (isDisableOnlyAgent(config.agent[name])) {
      delete config.agent[name];
      changed = true;
    }
  }
  if (Object.keys(config.agent).length === 0) {
    delete config.agent;
    changed = true;
  }
}

if (!changed) {
  console.log("No opencode-agent-prime entries found in opencode.jsonc");
  process.exit(0);
}

if (dryRun) {
  console.log("Would remove opencode-agent-prime plugin entries and disable-only built-in agent overrides");
  process.exit(0);
}

fs.writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
console.log("Updated opencode.jsonc");
'@

  $tempScript = [System.IO.Path]::ChangeExtension([System.IO.Path]::GetTempFileName(), ".cjs")
  try {
    Set-Content -LiteralPath $tempScript -Value $nodeScript -Encoding UTF8
    $nodeArgs = @($tempScript, $Path)
    if ($DryRun) {
      $nodeArgs += "--dry-run"
    }
    $output = & $node.Source @nodeArgs
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to update $Path"
    }
  } finally {
    Remove-Item -LiteralPath $tempScript -Force -ErrorAction SilentlyContinue
  }
  $output | ForEach-Object { Write-Action $_ }
}

Write-Action "Config directory: $ConfigDir"
if ($DryRun) {
  Write-Action "Dry run only; no files will be changed"
} elseif (-not $Delete) {
  Write-Action "Removed files will be moved under $backupRoot"
}

$pluginConfigPath = Join-Path $ConfigDir "opencode-agent-prime.json"
$pluginShimPath = Join-Path $ConfigDir "plugins\opencode-agent-prime.js"
$openCodeConfigPath = Join-Path $ConfigDir "opencode.jsonc"
$agentsPath = Join-Path $ConfigDir "AGENTS.md"
$pluginsDir = Join-Path $ConfigDir "plugins"

Update-OpenCodeConfig $openCodeConfigPath
Remove-InstalledPath $pluginConfigPath
Remove-InstalledPath $pluginShimPath

if ($RemoveAgents) {
  Remove-InstalledPath $agentsPath
} else {
  Write-Action "Leaving AGENTS.md in place; pass -RemoveAgents to remove it"
}

Remove-EmptyDirectory $pluginsDir
Write-Action "Removal complete"
