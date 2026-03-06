#!/usr/bin/env bun
import { createOhMyOpenCodeJsonSchema } from "./build-schema-document"

const SCHEMA_OUTPUT_PATH = "assets/opencode-imperial.schema.json"
const LEGACY_SCHEMA_OUTPUT_PATH = "assets/oh-my-opencode.schema.json"
const DIST_SCHEMA_OUTPUT_PATH = "dist/opencode-imperial.schema.json"
const LEGACY_DIST_SCHEMA_OUTPUT_PATH = "dist/oh-my-opencode.schema.json"

async function main() {
  console.log("Generating JSON Schema...")

  const finalSchema = createOhMyOpenCodeJsonSchema()

  await Bun.write(SCHEMA_OUTPUT_PATH, JSON.stringify(finalSchema, null, 2))
  await Bun.write(LEGACY_SCHEMA_OUTPUT_PATH, JSON.stringify(finalSchema, null, 2))
  await Bun.write(DIST_SCHEMA_OUTPUT_PATH, JSON.stringify(finalSchema, null, 2))
  await Bun.write(LEGACY_DIST_SCHEMA_OUTPUT_PATH, JSON.stringify(finalSchema, null, 2))

  console.log(`✓ JSON Schema generated: ${SCHEMA_OUTPUT_PATH}`)
}

main()
