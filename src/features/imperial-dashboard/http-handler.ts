import { buildImperialDashboardSnapshot, buildImperialTaskDetail } from "./snapshot"
import { renderImperialDashboardPage } from "./page"

type Options = {
  directory: string
  refreshMs: number
}

export function createImperialDashboardFetchHandler(options: Options): (request: Request) => Response {
  const { directory, refreshMs } = options

  return (request: Request): Response => {
    const url = new URL(request.url)
    const path = url.pathname

    if (path === "/imperial-dashboard" || path === "/imperial-dashboard/") {
      return new Response(renderImperialDashboardPage(), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    }

    if (path === "/imperial-dashboard/api/snapshot") {
      return json(buildImperialDashboardSnapshot(directory))
    }

    if (path.startsWith("/imperial-dashboard/api/tasks/")) {
      const sessionID = decodeURIComponent(path.slice("/imperial-dashboard/api/tasks/".length))
      const detail = buildImperialTaskDetail(directory, sessionID)
      if (!detail) return json({ error: "task not found", sessionID }, 404)
      return json(detail)
    }

    if (path === "/imperial-dashboard/events") {
      return createSseSnapshotResponse(directory, refreshMs)
    }

    if (path === "/imperial-dashboard/health") {
      return json({ status: "ok" })
    }

    return new Response("Not Found", { status: 404 })
  }
}

function createSseSnapshotResponse(directory: string, refreshMs: number): Response {
  let timer: ReturnType<typeof setInterval> | undefined
  const stream = new ReadableStream({
    start(controller) {
      const push = () => {
        const data = JSON.stringify(buildImperialDashboardSnapshot(directory))
        controller.enqueue(`event: snapshot\ndata: ${data}\n\n`)
      }
      push()
      timer = setInterval(push, refreshMs)
    },
    cancel() {
      if (timer) clearInterval(timer)
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  })
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}
