import { isAuthorized } from "./auth"
import { renderImperialDashboardPage } from "./page"
import {
  buildImperialDashboardSnapshot,
  buildImperialMemorialSummary,
  buildImperialTaskDetail,
  type ImperialDashboardSnapshotQuery,
} from "./snapshot"
import { applyTaskAction } from "./task-store"

type Options = {
  directory: string
  refreshMs: number
  authToken?: string
  onTaskAction?: (input: { action: "stop" | "cancel" | "resume"; sessionID: string; reason?: string }) => Promise<{
    ok: boolean
    note: string
  }>
}

type TaskActionBody = { action?: "stop" | "cancel" | "resume"; reason?: string }

export function createImperialDashboardFetchHandler(options: Options): (request: Request) => Response | Promise<Response> {
  const { directory, refreshMs, authToken } = options

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const path = url.pathname

    if (path === "/imperial-dashboard/health") {
      return json({ status: "ok" })
    }

    if (!isAuthorized(request, authToken)) {
      return json({ error: "unauthorized" }, 401)
    }

    if (path === "/imperial-dashboard" || path === "/imperial-dashboard/") {
      return new Response(renderImperialDashboardPage(), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    }

    if (path === "/imperial-dashboard/api/snapshot") {
      return json(buildImperialDashboardSnapshot(directory, parseSnapshotQuery(url)))
    }

    if (path === "/imperial-dashboard/api/memorials/summary") {
      return json(buildImperialMemorialSummary(directory))
    }

    if (path.startsWith("/imperial-dashboard/api/tasks/") && path.endsWith("/actions") && request.method === "POST") {
      const sessionID = decodeURIComponent(path.slice("/imperial-dashboard/api/tasks/".length, -"/actions".length))
      const body = (await safeJson<TaskActionBody>(request)) ?? {}
      if (!body.action) return json({ error: "action is required" }, 400)
      const result = applyTaskAction(directory, sessionID, body.action, body.reason)
      if (!result.ok) {
        return json({ message: result.message, task: result.task }, result.status)
      }
      let runtime: { ok: boolean; note: string } | undefined
      if (options.onTaskAction) {
        runtime = await options.onTaskAction({
          action: body.action,
          sessionID,
          reason: body.reason,
        })
      }
      return json({ message: result.message, task: result.task, runtime }, result.status)
    }

    if (path.startsWith("/imperial-dashboard/api/tasks/")) {
      const sessionID = decodeURIComponent(path.slice("/imperial-dashboard/api/tasks/".length))
      const detail = buildImperialTaskDetail(directory, sessionID)
      if (!detail) return json({ error: "task not found", sessionID }, 404)
      return json(detail)
    }

    if (path === "/imperial-dashboard/events") {
      return createSseSnapshotResponse(directory, refreshMs, authToken, url)
    }

    return new Response("Not Found", { status: 404 })
  }
}

function createSseSnapshotResponse(directory: string, refreshMs: number, authToken: string | undefined, url: URL): Response {
  const query = parseSnapshotQuery(url)
  let timer: ReturnType<typeof setInterval> | undefined

  if (authToken) {
    const token = url.searchParams.get("token")
    if (token !== authToken) return json({ error: "unauthorized" }, 401)
  }

  const stream = new ReadableStream({
    start(controller) {
      const push = () => {
        const data = JSON.stringify(buildImperialDashboardSnapshot(directory, query))
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

function parseSnapshotQuery(url: URL): ImperialDashboardSnapshotQuery {
  const limitRaw = url.searchParams.get("limit")
  const offsetRaw = url.searchParams.get("offset")
  const sort = url.searchParams.get("sort")
  const order = url.searchParams.get("order")

  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined
  const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined

  return {
    state: url.searchParams.get("state") ?? undefined,
    org: url.searchParams.get("org") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    control: url.searchParams.get("control") ?? undefined,
    sort: sort === "updatedAt" || sort === "createdAt" || sort === "title" || sort === "state" ? sort : undefined,
    order: order === "asc" || order === "desc" ? order : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
    offset: Number.isFinite(offset) ? offset : undefined,
  }
}

async function safeJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}
