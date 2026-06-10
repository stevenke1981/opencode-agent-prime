import { describe, expect, test } from "bun:test";
import { loadPluginConfig } from "./loader";

describe("loadPluginConfig", () => {
  test("returns defaults when no config file exists", () => {
    const config = loadPluginConfig("/nonexistent/project/path");
    expect(config.locale).toBe("zh-TW");
    expect(config.lessons.enabled).toBe(true);
    expect(config.planMode.minComplexity).toBe("L3");
    expect(config.errorRecovery.minAttemptsBeforeEscalate).toBe(3);
  });
});
