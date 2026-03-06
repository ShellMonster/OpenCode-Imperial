/**
 * Agent config keys to display names mapping.
 * Config keys are lowercase (e.g., "sisyphus", "atlas").
 * Display names use Chinese titles in "名称(职责)" format for UI/logs.
 */
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  sisyphus: "太子(总管执行)",
  hephaestus: "工部(深度执行)",
  prometheus: "中书省(制策规划)",
  atlas: "尚书省(统筹执行)",
  "sisyphus-junior": "六部执行官(分部执行)",
  metis: "中书参议(方案顾问)",
  momus: "门下省(审议复核)",
  oracle: "刑部(疑难会审)",
  librarian: "礼部(文献检索)",
  explore: "兵部(情报勘探)",
  "multimodal-looker": "户部(多模态审阅)",
}

/**
 * Get display name for an agent config key.
 * Uses case-insensitive lookup for backward compatibility.
 * Returns original key if not found.
 */
export function getAgentDisplayName(configKey: string): string {
  // Try exact match first
  const exactMatch = AGENT_DISPLAY_NAMES[configKey]
  if (exactMatch !== undefined) return exactMatch
  
  // Fall back to case-insensitive search
  const lowerKey = configKey.toLowerCase()
  for (const [k, v] of Object.entries(AGENT_DISPLAY_NAMES)) {
    if (k.toLowerCase() === lowerKey) return v
  }
  
  // Unknown agent: return original key
  return configKey
}

const REVERSE_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(AGENT_DISPLAY_NAMES).map(([key, displayName]) => [displayName.toLowerCase(), key]),
)

const LEGACY_DISPLAY_NAME_ALIASES: Record<string, string> = {
  "taizi (sisyphus)": "sisyphus",
  "gongbu (hephaestus)": "hephaestus",
  "zhongshu (prometheus)": "prometheus",
  "shangshu (atlas)": "atlas",
  "liubu executor": "sisyphus-junior",
  "zhongshu advisor (metis)": "metis",
  "menxia reviewer (momus)": "momus",
  "xingbu oracle": "oracle",
  "libu librarian": "librarian",
  "bingbu explore": "explore",
  "hubu multimodal": "multimodal-looker",
  "sisyphus (ultraworker)": "sisyphus",
  "hephaestus (deep agent)": "hephaestus",
  "prometheus (plan builder)": "prometheus",
  "atlas (plan executor)": "atlas",
  "sisyphus-junior": "sisyphus-junior",
  "metis (plan consultant)": "metis",
  "momus (plan critic)": "momus",
  oracle: "oracle",
  librarian: "librarian",
  explore: "explore",
  "multimodal-looker": "multimodal-looker",
}

/**
 * Resolve an agent name (display name or config key) to its lowercase config key.
 * "Atlas (Plan Executor)" → "atlas", "atlas" → "atlas", "unknown" → "unknown"
 */
export function getAgentConfigKey(agentName: string): string {
  const lower = agentName.toLowerCase()
  const reversed = REVERSE_DISPLAY_NAMES[lower]
  if (reversed !== undefined) return reversed
  const legacy = LEGACY_DISPLAY_NAME_ALIASES[lower]
  if (legacy !== undefined) return legacy
  if (AGENT_DISPLAY_NAMES[lower] !== undefined) return lower
  return lower
}
