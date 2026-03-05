export function generateImperialTaskID(now = new Date()): string {
  const yyyy = now.getFullYear().toString()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const hh = String(now.getHours()).padStart(2, "0")
  const mi = String(now.getMinutes()).padStart(2, "0")
  const ss = String(now.getSeconds()).padStart(2, "0")
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `JJC-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`
}
