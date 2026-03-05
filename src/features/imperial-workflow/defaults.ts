import type { ImperialRoleMap, ImperialPermissionMatrix } from "./types"

export const DEFAULT_IMPERIAL_ROLE_MAP: ImperialRoleMap = {
  prometheus: "zhongshu",
  momus: "menxia",
  atlas: "shangshu",
}

export const DEFAULT_IMPERIAL_PERMISSION_MATRIX: ImperialPermissionMatrix = {
  taizi: ["zhongshu"],
  zhongshu: ["menxia", "shangshu"],
  menxia: ["zhongshu", "shangshu"],
  shangshu: ["hubu", "libu", "bingbu", "xingbu", "gongbu", "libu_hr"],
  hubu: ["shangshu"],
  libu: ["shangshu"],
  bingbu: ["shangshu"],
  xingbu: ["shangshu"],
  gongbu: ["shangshu"],
  libu_hr: ["shangshu"],
}
