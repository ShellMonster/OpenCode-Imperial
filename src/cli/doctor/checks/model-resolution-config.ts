import { readFileSync } from "node:fs"
import { join } from "node:path"
import { detectConfigFile, getOpenCodeConfigPaths, parseJsonc } from "../../../shared"
import { LEGACY_PLUGIN_CONFIG_BASENAME, PLUGIN_CONFIG_BASENAME } from "../../../shared/branding"
import type { OmoConfig } from "./model-resolution-types"

const USER_CONFIG_BASE = join(
  getOpenCodeConfigPaths({ binary: "opencode", version: null }).configDir,
  PLUGIN_CONFIG_BASENAME
)
const LEGACY_USER_CONFIG_BASE = join(
  getOpenCodeConfigPaths({ binary: "opencode", version: null }).configDir,
  LEGACY_PLUGIN_CONFIG_BASENAME
)
const PROJECT_CONFIG_BASE = join(process.cwd(), ".opencode", PLUGIN_CONFIG_BASENAME)
const LEGACY_PROJECT_CONFIG_BASE = join(process.cwd(), ".opencode", LEGACY_PLUGIN_CONFIG_BASENAME)

export function loadOmoConfig(): OmoConfig | null {
  const projectDetected = detectConfigFile(PROJECT_CONFIG_BASE)
  if (projectDetected.format !== "none") {
    try {
      const content = readFileSync(projectDetected.path, "utf-8")
      return parseJsonc<OmoConfig>(content)
    } catch {
      return null
    }
  }

  const legacyProjectDetected = detectConfigFile(LEGACY_PROJECT_CONFIG_BASE)
  if (legacyProjectDetected.format !== "none") {
    try {
      const content = readFileSync(legacyProjectDetected.path, "utf-8")
      return parseJsonc<OmoConfig>(content)
    } catch {
      return null
    }
  }

  const userDetected = detectConfigFile(USER_CONFIG_BASE)
  if (userDetected.format !== "none") {
    try {
      const content = readFileSync(userDetected.path, "utf-8")
      return parseJsonc<OmoConfig>(content)
    } catch {
      return null
    }
  }

  const legacyUserDetected = detectConfigFile(LEGACY_USER_CONFIG_BASE)
  if (legacyUserDetected.format !== "none") {
    try {
      const content = readFileSync(legacyUserDetected.path, "utf-8")
      return parseJsonc<OmoConfig>(content)
    } catch {
      return null
    }
  }

  return null
}
