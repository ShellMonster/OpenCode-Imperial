const CHAT_PATTERNS = [
  /^hi[.! ]*$/i,
  /^hello[.! ]*$/i,
  /^thanks?[.! ]*$/i,
  /^你好[！!。.\s]*$/,
  /^谢谢[！!。.\s]*$/,
  /^早上好[！!。.\s]*$/,
]

const WORK_KEYWORDS = [
  "实现",
  "修复",
  "优化",
  "重构",
  "设计",
  "分析",
  "编写",
  "新增",
  "排查",
  "部署",
  "review",
  "implement",
  "fix",
  "refactor",
  "analyze",
  "build",
  "write",
]

export function isImperialWorkDirective(message: string): boolean {
  const text = message.trim()
  if (!text) return false
  if (CHAT_PATTERNS.some((pattern) => pattern.test(text))) return false
  if (text.length >= 24) return true
  const lower = text.toLowerCase()
  return WORK_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export function extractImperialTaskTitle(message: string): string {
  const clean = message
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!clean) return "Untitled task"
  if (clean.length <= 80) return clean
  return `${clean.slice(0, 77)}...`
}
