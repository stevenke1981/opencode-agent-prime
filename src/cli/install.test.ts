import { describe, expect, test } from "bun:test";
import { mergeOpenCodeConfig, parseOpenCodeConfig } from "./install";

describe("installer config merge", () => {
  test("parses JSONC with comments and trailing commas", () => {
    const config = parseOpenCodeConfig(`{
      // OpenCode plugin list
      "plugin": ["other-plugin",],
      "mcp": {
        "docs": { "url": "https://example.com//not-a-comment", },
      },
    }`);

    expect(config.plugin).toEqual(["other-plugin"]);
    expect(config.mcp).toEqual({
      docs: { url: "https://example.com//not-a-comment" },
    });
  });

  test("adds this plugin without clobbering existing config", () => {
    const merged = mergeOpenCodeConfig(
      {
        plugin: [
          "other-plugin",
          "opencode-agent-prime@0.1.0",
          "file:///tmp/opencode-agent-prime/dist/index.js",
          ["opencode-agent-prime", { name: "agent-prime" }],
        ],
        agent: {
          build: { model: "custom/build-model" },
          custom: { model: "custom/agent-model" },
        },
        lsp: false,
        mcp: {
          "codebase-memory-mcp": { command: "codebase-memory-mcp" },
        },
      },
      "D:\\opencode-agent-prime",
    );

    expect(merged.plugin).toEqual(["D:\\opencode-agent-prime", "other-plugin"]);
    expect(merged.lsp).toBe(false);
    expect(merged.mcp).toEqual({
      "codebase-memory-mcp": { command: "codebase-memory-mcp" },
    });
    expect(merged.agent?.custom).toEqual({ model: "custom/agent-model" });
    expect(merged.agent?.build).toEqual({
      model: "custom/build-model",
      disable: true,
    });
    expect(merged.agent?.plan).toEqual({ disable: true });
  });
});
