import { describe, expect, test } from "bun:test";
import { PluginConfigSchema } from "../config";
import { createAgents, getAgentConfigs } from "./index";

describe("createAgents", () => {
  test("registers Mastermind as the primary agent", () => {
    const config = PluginConfigSchema.parse({
      preset: "openai",
      presets: {
        openai: {
          orchestrator: { model: "openai/legacy-primary" },
        },
      },
    });

    const agents = createAgents("/tmp/project", config);
    const agentConfigs = getAgentConfigs(agents);

    expect(agents.mastermind?.name).toBe("mastermind");
    expect(agents.mastermind?.config.mode).toBe("primary");
    expect(agents.mastermind?.config.model).toBe("openai/legacy-primary");
    expect(agentConfigs.mastermind?.mode).toBe("primary");
    expect(agentConfigs.mastermind?.description).toContain("Mastermind");
    expect(agents.orchestrator).toBeUndefined();
  });
});
