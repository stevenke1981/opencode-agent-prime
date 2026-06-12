#!/usr/bin/env bun
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { PluginConfigSchema } from "../src/config/schema";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(rootDir, "opencode-agent-prime.schema.json");

const schema = z.toJSONSchema(PluginConfigSchema, { io: "input" });
const jsonSchema = {
  ...schema,
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "opencode-agent-prime",
  description: "Configuration schema for opencode-agent-prime OpenCode plugin",
};

function stringifySchema(value: unknown, depth = 0): string {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);

  if (Array.isArray(value)) {
    const inline = `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
    if (
      value.every(
        (item) =>
          item === null ||
          ["string", "number", "boolean"].includes(typeof item),
      ) &&
      indent.length + inline.length <= 80
    ) {
      return inline;
    }
    return `[\n${value
      .map((item) => `${nextIndent}${stringifySchema(item, depth + 1)}`)
      .join(",\n")}\n${indent}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(
        ([key, item]) =>
          `${nextIndent}${JSON.stringify(key)}: ${stringifySchema(item, depth + 1)}`,
      )
      .join(",\n")}\n${indent}}`;
  }

  return JSON.stringify(value);
}

writeFileSync(outputPath, `${stringifySchema(jsonSchema)}\n`);
console.log(`Schema written to ${outputPath}`);
