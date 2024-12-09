import { z } from 'zod'

export const ModalCommanderConfigSchema = z.object({
  rootCommand: z.string().min(1, "Name must not be empty"),
  rootProps: z.any(), // This field can be anything
})

// Type inference from the schema
export type ModalCommanderConfig = z.infer<typeof ModalCommanderConfigSchema>
