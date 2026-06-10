import { describe, expect, test } from "bun:test";
import { PluginConfigSchema } from "../config/schema";
import { consumeErrorEscalation, recordToolFailure } from "./error-recovery";

describe("error recovery", () => {
  test("escalates after configured failure count", () => {
    const config = PluginConfigSchema.parse({
      errorRecovery: { minAttemptsBeforeEscalate: 3 },
    });
    const sessionID = "test-session";

    recordToolFailure(sessionID, config);
    recordToolFailure(sessionID, config);
    expect(consumeErrorEscalation(sessionID)).toBeNull();

    recordToolFailure(sessionID, config);
    const escalation = consumeErrorEscalation(sessionID);
    expect(escalation).toContain("error_recovery_escalation");
    expect(consumeErrorEscalation(sessionID)).toBeNull();
  });
});
