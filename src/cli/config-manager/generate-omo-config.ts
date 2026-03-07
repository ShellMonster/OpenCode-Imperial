import type { InstallConfig } from "../types"
import { generateModelConfig } from "../model-fallback"

export function generateOmoConfig(installConfig: InstallConfig): Record<string, unknown> {
  const modelConfig = generateModelConfig(installConfig)

  return {
    ...modelConfig,
    imperial_workflow: {
      enabled: true,
      dashboard: {
        enabled: true,
      },
    },
  }
}
