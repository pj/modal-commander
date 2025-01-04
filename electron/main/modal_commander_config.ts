import { z } from 'zod'

const CommandSchema = z.object({
  key: z.string(),
  type: z.literal("command"),
  package: z.string(),
  name: z.string().min(1, "Name must not be empty"),
  props: z.any(),
});

const OperationSchema = z.object({
  key: z.string(),
  type: z.literal("operation"),
  package: z.string(),
  name: z.string().min(1, "Name must not be empty"),
  message: z.any(),
});

export const ModalCommanderConfigSchema = z.object({
  hotkeys: z.array(
      z.union([
        CommandSchema,
        OperationSchema,
      ]),
  ),
  commandConfig: z.array(
    z.object({
      name: z.string().min(1, "Name must not be empty"),
      package: z.string().min(1, "Package must not be empty"),
      config: z.any(),
    })
  )
});

// Type inference from the schema
export type ModalCommanderConfig = z.infer<typeof ModalCommanderConfigSchema>
