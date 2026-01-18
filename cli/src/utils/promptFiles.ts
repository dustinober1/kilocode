import { readFile } from "fs/promises"
import { existsSync } from "fs"

/**
 * Read a UTF-8 file and trim BOM if present.
 * @throws Error if file doesn't exist or can't be read
 */
export async function readUtf8File(filePath: string): Promise<string> {
	// Check if file exists
	if (!existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`)
	}

	try {
		const content = await readFile(filePath, "utf-8")

		// Trim UTF-8 BOM if present (0xEF 0xBB 0xBF)
		if (content.charCodeAt(0) === 0xfeff) {
			return content.slice(1)
		}

		return content
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		throw new Error(`Failed to read file: ${filePath} - ${errorMessage}`)
	}
}

/**
 * Parameters for resolveExclusiveTextOrFile
 */
export interface ExclusiveTextOrFileParams {
	text?: string
	filePath?: string
	textFlagName: string
	fileFlagName: string
}

/**
 * Enforce "text XOR file" rule with good error messages.
 * Returns the resolved text content or undefined if neither provided.
 */
export async function resolveExclusiveTextOrFile(params: ExclusiveTextOrFileParams): Promise<string | undefined> {
	const { text, filePath, textFlagName, fileFlagName } = params

	// Neither provided
	if (!text && !filePath) {
		return undefined
	}

	// Both provided - error
	if (text && filePath) {
		throw new Error(
			`Cannot specify both ${textFlagName} and ${fileFlagName}. Please use only one of these options.`,
		)
	}

	// Only text provided
	if (text) {
		return text
	}

	// Only file provided
	return await readUtf8File(filePath!)
}

/**
 * Parameters for resolveInitialPrompt
 */
export interface ResolveInitialPromptParams {
	promptArg?: string
	promptFilePath?: string
	auto: boolean
	jsonIo: boolean
}

/**
 * Enforce "positional arg XOR --prompt-file" and implement stdin-as-prompt rules.
 * Returns a final prompt string (may be empty if interactive run with no prompt).
 */
export async function resolveInitialPrompt(params: ResolveInitialPromptParams): Promise<string> {
	const { promptArg, promptFilePath, auto, jsonIo } = params

	// Check for conflict between arg and file
	if (promptArg && promptFilePath) {
		throw new Error(
			"Cannot specify both positional prompt argument and --prompt-file. Please use only one of these options.",
		)
	}

	// If file is provided, read from file
	if (promptFilePath) {
		return await readUtf8File(promptFilePath)
	}

	// If arg is provided, use it
	if (promptArg) {
		return promptArg
	}

	// Read from stdin if:
	// - no positional prompt
	// - no prompt file
	// - --auto is enabled
	// - stdin is piped (not a TTY)
	// - --json-io is NOT enabled (stdin reserved for JSON messages)
	if (auto && !jsonIo && !process.stdin.isTTY) {
		const chunks: Buffer[] = []
		for await (const chunk of process.stdin) {
			chunks.push(chunk)
		}
		return Buffer.concat(chunks).toString("utf-8").trim()
	}

	// No prompt source - return empty string
	return ""
}
