import type { GitMasterConfig } from "../../config/schema"

const DEFAULT_COMMIT_FOOTER = "Assisted-by: OpenCode Imperial"
const DEFAULT_CO_AUTHOR = "Co-authored-by: OpenCode Imperial <noreply@opencode-imperial.local>"

export function injectGitMasterConfig(template: string, config?: GitMasterConfig): string {
	const commitFooter = config?.commit_footer ?? true
	const includeCoAuthoredBy = config?.include_co_authored_by ?? true

	if (!commitFooter && !includeCoAuthoredBy) {
		return template
	}

	const sections: string[] = []

	sections.push("### 5.5 Commit Footer & Co-Author")
	sections.push("")
	sections.push("Add OpenCode Imperial attribution to EVERY commit:")
	sections.push("")

	if (commitFooter) {
		const footerText =
			typeof commitFooter === "string"
				? commitFooter
				: DEFAULT_COMMIT_FOOTER
		sections.push("1. **Footer in commit body:**")
		sections.push("```")
		sections.push(footerText)
		sections.push("```")
		sections.push("")
	}

	if (includeCoAuthoredBy) {
		sections.push(`${commitFooter ? "2" : "1"}. **Co-authored-by trailer:**`)
		sections.push("```")
		sections.push(DEFAULT_CO_AUTHOR)
		sections.push("```")
		sections.push("")
	}

	if (commitFooter && includeCoAuthoredBy) {
		const footerText =
			typeof commitFooter === "string"
				? commitFooter
				: DEFAULT_COMMIT_FOOTER
		sections.push("**Example (both enabled):**")
		sections.push("```bash")
		sections.push(
			`git commit -m "{Commit Message}" -m "${footerText}" -m "${DEFAULT_CO_AUTHOR}"`
		)
		sections.push("```")
	} else if (commitFooter) {
		const footerText =
			typeof commitFooter === "string"
				? commitFooter
				: DEFAULT_COMMIT_FOOTER
		sections.push("**Example:**")
		sections.push("```bash")
		sections.push(`git commit -m "{Commit Message}" -m "${footerText}"`)
		sections.push("```")
	} else if (includeCoAuthoredBy) {
		sections.push("**Example:**")
		sections.push("```bash")
		sections.push(`git commit -m "{Commit Message}" -m "${DEFAULT_CO_AUTHOR}"`)
		sections.push("```")
	}

	const injection = sections.join("\n")

	const insertionPoint = template.indexOf("```\n</execution>")
	if (insertionPoint !== -1) {
		return (
			template.slice(0, insertionPoint) +
			"```\n\n" +
			injection +
			"\n</execution>" +
			template.slice(insertionPoint + "```\n</execution>".length)
		)
	}

	return template + "\n\n" + injection
}
