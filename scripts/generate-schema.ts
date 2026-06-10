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

writeFileSync(outputPath, `${JSON.stringify(jsonSchema, null, 2)}\n`);
console.log(`Schema written to ${outputPath}`);
