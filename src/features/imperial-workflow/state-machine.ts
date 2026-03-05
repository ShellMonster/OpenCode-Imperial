import type { ImperialRole } from "../../config/schema/imperial-workflow"

export type ImperialTaskState =
  | "Pending"
  | "Zhongshu"
  | "Menxia"
  | "Assigned"
  | "Doing"
  | "Review"
  | "Done"

export function nextStateFromDelegation(
  callerRole: ImperialRole,
  targetRole: ImperialRole,
): ImperialTaskState | null {
  if (callerRole === "taizi" && targetRole === "zhongshu") return "Zhongshu"
  if (callerRole === "zhongshu" && targetRole === "menxia") return "Menxia"
  if (callerRole === "menxia" && targetRole === "zhongshu") return "Zhongshu"
  if (callerRole === "zhongshu" && targetRole === "shangshu") return "Assigned"
  if (
    callerRole === "shangshu" &&
    ["hubu", "libu", "bingbu", "xingbu", "gongbu", "libu_hr"].includes(targetRole)
  ) {
    return "Doing"
  }
  if (
    ["hubu", "libu", "bingbu", "xingbu", "gongbu", "libu_hr"].includes(callerRole) &&
    targetRole === "shangshu"
  ) {
    return "Review"
  }
  if (callerRole === "shangshu" && targetRole === "zhongshu") return "Done"
  return null
}

export function canTransition(from: ImperialTaskState, to: ImperialTaskState): boolean {
  const allowed: Record<ImperialTaskState, ImperialTaskState[]> = {
    Pending: ["Zhongshu", "Menxia", "Assigned", "Doing", "Review", "Done"],
    Zhongshu: ["Menxia", "Assigned"],
    Menxia: ["Zhongshu", "Assigned"],
    Assigned: ["Doing"],
    Doing: ["Review", "Doing"],
    Review: ["Done", "Zhongshu"],
    Done: [],
  }
  return allowed[from].includes(to)
}
