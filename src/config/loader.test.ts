import { describe, expect, test } from "bun:test";
import { getAgentOverride, loadPluginConfig } from "./loader";
import { PluginConfigSchema } from "./schema";

describe("loadPluginConfig", () => {
  test("returns defaults when no config file exists", () => {
    const config = loadPluginConfig("/nonexistent/project/path");
    expect(config.locale).toBe("zh-TW");
    expect(config.lessons.enabled).toBe(true);
    expect(config.planMode.minComplexity).toBe("L3");
    expect(config.errorRecovery.minAttemptsBeforeEscalate).toBe(3);
  });

  test("uses legacy mastermind preset for orchestrator", () => {
    const config = PluginConfigSchema.parse({
      preset: "openai",
      presets: {
        openai: {
          mastermind: { model: "openai/legacy-primary" },
        },
      },
    });

    expect(getAgentOverride(config, "orchestrator")?.model).toBe(
      "openai/legacy-primary",
    );
  });
});
