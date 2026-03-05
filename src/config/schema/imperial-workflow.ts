import { z } from "zod"

export const ImperialRoleSchema = z.enum([
  "taizi",
  "zhongshu",
  "menxia",
  "shangshu",
  "hubu",
  "libu",
  "bingbu",
  "xingbu",
  "gongbu",
  "libu_hr",
])

export const ImperialPermissionMatrixSchema = z.record(
  z.string(),
  z.array(ImperialRoleSchema),
)

export const ImperialWorkflowConfigSchema = z.object({
  /** Enable imperial workflow governance for task delegation */
  enabled: z.boolean().optional(),
  /** Require Menxia review before Zhongshu can dispatch to Shangshu */
  strict_review: z.boolean().optional(),
  /** Deny delegation when either side is unmapped */
  strict_mapping: z.boolean().optional(),
  /** Require non-empty review note before zhongshu can dispatch to shangshu */
  require_review_note: z.boolean().optional(),
  /** Maximum allowed Zhongshu -> Menxia review rounds per session */
  max_review_round: z.number().int().min(1).max(10).optional(),
  /** Soft mapping: agent name/config key -> imperial role */
  role_map: z.record(z.string(), ImperialRoleSchema).optional(),
  /** Role permission matrix override */
  permission_matrix: ImperialPermissionMatrixSchema.optional(),
  /** Stall threshold (seconds) for auto retry/escalation checks */
  stall_threshold_sec: z.number().int().min(30).max(3600).optional(),
  /** Maximum auto retry count before escalation */
  max_retry: z.number().int().min(0).max(10).optional(),
  /** Optional local dashboard runtime config */
  dashboard: z.object({
    enabled: z.boolean().optional(),
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    refresh_ms: z.number().int().min(300).max(10000).optional(),
    auth_token: z.string().min(8).optional(),
  }).optional(),
})

export type ImperialRole = z.infer<typeof ImperialRoleSchema>
export type ImperialPermissionMatrix = z.infer<typeof ImperialPermissionMatrixSchema>
export type ImperialWorkflowConfig = z.infer<typeof ImperialWorkflowConfigSchema>
