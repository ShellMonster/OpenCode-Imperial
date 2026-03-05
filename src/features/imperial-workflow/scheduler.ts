import type { ImperialTaskRecord } from "./task-types"

export type SchedulerCheckResult =
  | { type: "none" }
  | { type: "retry"; remark: string }
  | { type: "escalate"; remark: string }

export function evaluateTaskScheduler(task: ImperialTaskRecord, now: Date): SchedulerCheckResult {
  if (!task.scheduler.enabled) return { type: "none" }
  if (task.state === "Done") return { type: "none" }
  if (task.control?.status && task.control.status !== "active") return { type: "none" }

  const elapsedSec =
    (now.getTime() - new Date(task.scheduler.lastProgressAt).getTime()) / 1000
  if (elapsedSec < task.scheduler.stallThresholdSec) return { type: "none" }

  if (task.scheduler.retryCount < task.scheduler.maxRetry) {
    return {
      type: "retry",
      remark: `auto-retry triggered after ${Math.floor(elapsedSec)}s stall`,
    }
  }

  return {
    type: "escalate",
    remark: `escalation triggered after ${Math.floor(elapsedSec)}s stall`,
  }
}
