import { describe, expect, test } from "bun:test";
import { PluginConfigSchema } from "../config";
import { createAgents, getAgentConfigs } from "./index";

describe("createAgents", () => {
  test("registers Orchestrator as the yellow primary agent", () => {
    const config = PluginConfigSchema.parse({
      preset: "openai",
      presets: {
        openai: {
          mastermind: { model: "openai/legacy-primary" },
        },
      },
    });

    const agents = createAgents("/tmp/project", config);
    const agentConfigs = getAgentConfigs(agents);

    expect(agents.orchestrator?.name).toBe("orchestrator");
    expect(agents.orchestrator?.config.mode).toBe("primary");
    expect(agents.orchestrator?.config.model).toBe("openai/legacy-primary");
    expect(agentConfigs.orchestrator?.mode).toBe("primary");
    expect(agentConfigs.orchestrator?.description).toContain("Orchestrator");
    expect(agentConfigs.orchestrator?.color).toBe("#FACC15");
    expect(agents.mastermind).toBeUndefined();
  });
});
