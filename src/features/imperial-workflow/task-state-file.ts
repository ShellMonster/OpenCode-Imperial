import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { ImperialTaskRecord } from "./task-types"

export type ImperialTaskStateFile = {
  tasks: Record<string, ImperialTaskRecord>
}

const LOCK_TIMEOUT_MS = 2500
const LOCK_RETRY_MS = 25

export function getImperialTaskFilePath(directory: string): string {
  return join(directory, ".sisyphus", "imperial-workflow", "tasks.json")
}

export function readImperialTaskStateFile(filePath: string): ImperialTaskStateFile {
  if (!existsSync(filePath)) return { tasks: {} }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as ImperialTaskStateFile
    if (!parsed?.tasks || typeof parsed.tasks !== "object") return { tasks: {} }
    return parsed
  } catch {
    return { tasks: {} }
  }
}

export function writeImperialTaskStateFile(filePath: string, data: ImperialTaskStateFile): void {
  mkdirSync(dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8")
  renameSync(tempPath, filePath)
}

export function mutateImperialTaskStateFile<T>(
  filePath: string,
  mutator: (state: ImperialTaskStateFile) => T,
): { state: ImperialTaskStateFile; result: T } {
  const lockPath = `${filePath}.lock`
  const startedAt = Date.now()
  let lockFd: number | undefined

  while (lockFd === undefined) {
    try {
      mkdirSync(dirname(filePath), { recursive: true })
      lockFd = openSync(lockPath, "wx")
    } catch (error) {
      if (!(error instanceof Error) || !String((error as NodeJS.ErrnoException).code).includes("EEXIST")) {
        throw error
      }
      if (Date.now() - startedAt > LOCK_TIMEOUT_MS) {
        rmSync(lockPath, { force: true })
        continue
      }
      sleepSync(LOCK_RETRY_MS)
    }
  }

  try {
    const state = readImperialTaskStateFile(filePath)
    const result = mutator(state)
    writeImperialTaskStateFile(filePath, state)
    return { state, result }
  } finally {
    try {
      closeSync(lockFd)
    } catch {}
    rmSync(lockPath, { force: true })
  }
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}
