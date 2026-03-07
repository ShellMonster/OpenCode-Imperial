/**
 * Cross-platform check if a path is inside .opencode-imperial/ directory.
 * Legacy .sisyphus/ paths remain allowed for compatibility.
 */
export function isSisyphusPath(filePath: string): boolean {
  return /\.(opencode-imperial|sisyphus)[/\\]/.test(filePath)
}
