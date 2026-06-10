import { z } from "zod";
import { ALL_AGENT_NAMES } from "./constants";

export const AgentOverrideConfigSchema = z.object({
  model: z.string().optional(),
  variant: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  skills: z.array(z.string()).optional(),
  mcps: z.array(z.string()).optional(),
});

export const PluginConfigSchema = z
  .object({
    preset: z.string().optional(),
    disabled_agents: z.array(z.enum(ALL_AGENT_NAMES)).optional(),
    locale: z.enum(["zh-TW", "en"]).default("zh-TW"),
    lessons: z
      .object({
        enabled: z.boolean().default(true),
        path: z.string().default("lessons.md"),
        readAtSessionStart: z.boolean().default(true),
        promptAfterIdle: z.boolean().default(true),
      })
      .default({
        enabled: true,
        path: "lessons.md",
        readAtSessionStart: true,
        promptAfterIdle: true,
      }),
    planMode: z
      .object({
        enabled: z.boolean().default(true),
        plansDir: z.string().default(".opencode/plans"),
        minComplexity: z.enum(["L1", "L2", "L3", "L4"]).default("L3"),
      })
      .default({
        enabled: true,
        plansDir: ".opencode/plans",
        minComplexity: "L3",
      }),
    memoryMcp: z
      .object({
        enabled: z.boolean().default(true),
        serverName: z.string().default("codebase-memory-mcp"),
        remindAtTaskStart: z.boolean().default(true),
      })
      .default({
        enabled: true,
        serverName: "codebase-memory-mcp",
        remindAtTaskStart: true,
      }),
    errorRecovery: z
      .object({
        enabled: z.boolean().default(true),
        minAttemptsBeforeEscalate: z.number().int().min(1).default(3),
      })
      .default({
        enabled: true,
        minAttemptsBeforeEscalate: 3,
      }),
    agents: z.record(z.string(), AgentOverrideConfigSchema).optional(),
    presets: z
      .record(z.string(), z.record(z.string(), AgentOverrideConfigSchema))
      .optional(),
  })
  .strict();

export type PluginConfig = z.infer<typeof PluginConfigSchema>;
export type AgentOverrideConfig = z.infer<typeof AgentOverrideConfigSchema>;
