import { z } from 'zod'

export const ModalCommanderConfigSchema = z.object({
  rootCommand: z.object({
    package: z.string(),
    name: z.string().min(1, "Name must not be empty"),
    props: z.any(), // This field can be anything
  }),
})

// Type inference from the schema
export type ModalCommanderConfig = z.infer<typeof ModalCommanderConfigSchema>
