import { describe, expect, test } from "bun:test";
import { PluginConfigSchema } from "../config/schema";
import { buildOrchestratorPrompt } from "./orchestrator";

describe("buildOrchestratorPrompt", () => {
  test("includes AGENT-PRIME mission and zh-TW locale", () => {
    const config = PluginConfigSchema.parse({ locale: "zh-TW" });
    const prompt = buildOrchestratorPrompt(config);
    expect(prompt).toContain("AGENT-PRIME");
    expect(prompt).toContain("Traditional Chinese (zh-TW)");
    expect(prompt).toContain("lessons.md");
    expect(prompt).toContain("@explorer");
    expect(prompt).toContain("@oracle");
  });

  test("includes plan mode path from config", () => {
    const config = PluginConfigSchema.parse({
      planMode: { plansDir: ".opencode/plans" },
    });
    const prompt = buildOrchestratorPrompt(config);
    expect(prompt).toContain(".opencode/plans");
  });

  test("includes council and background delegation when council configured", () => {
    const config = PluginConfigSchema.parse({
      council: {
        presets: {
          default: {
            alpha: { model: "openai/gpt-5.4-mini" },
          },
        },
      },
    });
    const prompt = buildOrchestratorPrompt(config);
    expect(prompt).toContain("@council");
    expect(prompt).toContain("run_in_background");
  });
});
