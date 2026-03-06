import * as z from "zod"
import { OhMyOpenCodeConfigSchema } from "../src/config/schema"

export function createOhMyOpenCodeJsonSchema(): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(OhMyOpenCodeConfigSchema, {
    target: "draft-7",
    unrepresentable: "any",
  })

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://raw.githubusercontent.com/ShellMonster/OpenCode-Imperial/dev/assets/opencode-imperial.schema.json",
    title: "OpenCode Imperial Configuration",
    description: "Configuration schema for opencode-imperial plugin",
    ...jsonSchema,
  }
}
