import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { getImperialTaskStateStore } from "../../features/imperial-workflow"

export function createImperialTaskActivityTool(directory: string): ToolDefinition {
  return tool({
    description:
      "Inspect imperial workflow task status and activity for current session or a specified session_id.",
    args: {
      session_id: tool.schema.string().optional().describe("Target session id. Defaults to current session."),
    },
    async execute(args, toolContext) {
      const sessionID = args.session_id ?? toolContext.sessionID
      const store = getImperialTaskStateStore(directory)
      const task = store.get(sessionID)
      if (!task) return `No imperial task found for session: ${sessionID}`

      const activity = store.getActivity(sessionID)
      return JSON.stringify(
        {
          task: {
            id: task.id,
            title: task.title,
            state: task.state,
            org: task.org,
            reviewRound: task.reviewRound,
            scheduler: task.scheduler,
            updatedAt: task.updatedAt,
          },
          activity,
        },
        null,
        2,
      )
    },
  })
}
