import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readUtf8File, resolveExclusiveTextOrFile, resolveInitialPrompt } from "../utils/promptFiles.js"
import { validateOnTaskCompletedPrompt } from "../pr/on-task-completed.js"
import { readFile } from "fs/promises"
import { existsSync } from "fs"

// Mock fs/promises
vi.mock("fs/promises", () => ({
	readFile: vi.fn(),
}))

// Mock fs
vi.mock("fs", () => ({
	existsSync: vi.fn(),
}))

// Mock process.stdin
const mockStdin = {
	isTTY: true,
	[Symbol.asyncIterator]: function* () {
		// Default empty iterator
	},
}

// Store original process.stdin
const originalStdin = process.stdin

describe("readUtf8File", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		// Restore original process.stdin
		Object.defineProperty(process, "stdin", {
			value: originalStdin,
			writable: false,
		})
	})

	it("should strip UTF-8 BOM (0xEF 0xBB 0xBF) when present", async () => {
		const fileContent = "\uFEFFHello, World!"
		const filePath = "/test/file.txt"

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFile).mockResolvedValue(fileContent)

		const result = await readUtf8File(filePath)

		expect(result).toBe("Hello, World!")
		expect(existsSync).toHaveBeenCalledWith(filePath)
		expect(readFile).toHaveBeenCalledWith(filePath, "utf-8")
	})

	it("should read normal files correctly", async () => {
		const fileContent = "Hello, World!"
		const filePath = "/test/file.txt"

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFile).mockResolvedValue(fileContent)

		const result = await readUtf8File(filePath)

		expect(result).toBe("Hello, World!")
		expect(existsSync).toHaveBeenCalledWith(filePath)
		expect(readFile).toHaveBeenCalledWith(filePath, "utf-8")
	})

	it("should throw a clear error when file doesn't exist", async () => {
		const filePath = "/test/nonexistent.txt"

		vi.mocked(existsSync).mockReturnValue(false)

		await expect(readUtf8File(filePath)).rejects.toThrow("File not found: /test/nonexistent.txt")
		expect(existsSync).toHaveBeenCalledWith(filePath)
		expect(readFile).not.toHaveBeenCalled()
	})

	it("should throw a clear error when file can't be read", async () => {
		const filePath = "/test/file.txt"
		const readError = new Error("Permission denied")

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFile).mockRejectedValue(readError)

		await expect(readUtf8File(filePath)).rejects.toThrow("Failed to read file: /test/file.txt - Permission denied")
		expect(existsSync).toHaveBeenCalledWith(filePath)
		expect(readFile).toHaveBeenCalledWith(filePath, "utf-8")
	})
})

describe("resolveExclusiveTextOrFile", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should return text when only text is provided", async () => {
		const result = await resolveExclusiveTextOrFile({
			text: "Hello, World!",
			textFlagName: "--custom-text",
			fileFlagName: "--custom-file",
		})

		expect(result).toBe("Hello, World!")
	})

	it("should return file content when only file is provided", async () => {
		const fileContent = "File content here"
		const filePath = "/test/file.txt"

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFile).mockResolvedValue(fileContent)

		const result = await resolveExclusiveTextOrFile({
			filePath,
			textFlagName: "--custom-text",
			fileFlagName: "--custom-file",
		})

		expect(result).toBe(fileContent)
	})

	it("should error when both text and file are provided with good error message including both flag names", async () => {
		await expect(
			resolveExclusiveTextOrFile({
				text: "Hello",
				filePath: "/test/file.txt",
				textFlagName: "--my-text",
				fileFlagName: "--my-file",
			}),
		).rejects.toThrow("Cannot specify both --my-text and --my-file. Please use only one of these options.")
	})

	it("should return undefined when neither text nor file is provided", async () => {
		const result = await resolveExclusiveTextOrFile({
			textFlagName: "--custom-text",
			fileFlagName: "--custom-file",
		})

		expect(result).toBeUndefined()
	})
})

describe("resolveInitialPrompt", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Set up mock stdin with TTY by default
		Object.defineProperty(process, "stdin", {
			value: mockStdin,
			writable: false,
		})
	})

	afterEach(() => {
		// Restore original process.stdin
		Object.defineProperty(process, "stdin", {
			value: originalStdin,
			writable: false,
		})
	})

	it("should error when both prompt arg and prompt file are provided", async () => {
		await expect(
			resolveInitialPrompt({
				promptArg: "Hello from arg",
				promptFilePath: "/test/file.txt",
				auto: false,
				jsonIo: false,
			}),
		).rejects.toThrow(
			"Cannot specify both positional prompt argument and --prompt-file. Please use only one of these options.",
		)
	})

	it("should read from file when provided", async () => {
		const fileContent = "Hello from file"
		const filePath = "/test/prompt.txt"

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFile).mockResolvedValue(fileContent)

		const result = await resolveInitialPrompt({
			promptFilePath: filePath,
			auto: false,
			jsonIo: false,
		})

		expect(result).toBe(fileContent)
		expect(existsSync).toHaveBeenCalledWith(filePath)
		expect(readFile).toHaveBeenCalledWith(filePath, "utf-8")
	})

	it("should read from stdin when --auto is enabled and --json-io is NOT enabled and stdin is piped", async () => {
		// Create mock stdin with piped content
		const stdinContent = "Hello from stdin"
		const chunks = [Buffer.from(stdinContent)]

		const pipedStdin = {
			isTTY: false,
			[Symbol.asyncIterator]: async function* () {
				for (const chunk of chunks) {
					yield chunk
				}
			},
		}

		Object.defineProperty(process, "stdin", {
			value: pipedStdin,
			writable: false,
		})

		const result = await resolveInitialPrompt({
			auto: true,
			jsonIo: false,
		})

		expect(result).toBe(stdinContent)
	})

	it("should NOT read from stdin when --json-io is enabled", async () => {
		// Create mock stdin with piped content
		const stdinContent = "Hello from stdin"
		const chunks = [Buffer.from(stdinContent)]

		const pipedStdin = {
			isTTY: false,
			[Symbol.asyncIterator]: async function* () {
				for (const chunk of chunks) {
					yield chunk
				}
			},
		}

		Object.defineProperty(process, "stdin", {
			value: pipedStdin,
			writable: false,
		})

		const result = await resolveInitialPrompt({
			auto: true,
			jsonIo: true,
		})

		// Should not read from stdin when json-io is enabled
		expect(result).toBe("")
	})

	it("should return empty string when no prompt source is provided (interactive mode)", async () => {
		const result = await resolveInitialPrompt({
			auto: false,
			jsonIo: false,
		})

		expect(result).toBe("")
	})

	it("should use prompt arg when provided", async () => {
		const result = await resolveInitialPrompt({
			promptArg: "Hello from arg",
			auto: false,
			jsonIo: false,
		})

		expect(result).toBe("Hello from arg")
	})

	it("should NOT read from stdin when stdin is a TTY (interactive terminal)", async () => {
		// Mock stdin as TTY (interactive terminal)
		const ttyStdin = {
			isTTY: true,
			[Symbol.asyncIterator]: async function* () {
				// Should not be called
				yield Buffer.from("Should not be read")
			},
		}

		Object.defineProperty(process, "stdin", {
			value: ttyStdin,
			writable: false,
		})

		const result = await resolveInitialPrompt({
			auto: true,
			jsonIo: false,
		})

		expect(result).toBe("")
	})
})

describe("--on-task-completed-file validation", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should validate file content via validateOnTaskCompletedPrompt - must require --auto", async () => {
		const fileContent = "Task completed!"
		const filePath = "/test/on-task-completed.txt"

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFile).mockResolvedValue(fileContent)

		const result = await resolveExclusiveTextOrFile({
			filePath,
			textFlagName: "--on-task-completed",
			fileFlagName: "--on-task-completed-file",
		})

		expect(result).toBe(fileContent)

		// Validate the content
		if (result !== undefined) {
			const validationResult = validateOnTaskCompletedPrompt(result)
			expect(validationResult.valid).toBe(true)
		}
	})

	it("should validate that file content is non-empty/whitespace-only", async () => {
		const fileContent = "   \n\t   "
		const filePath = "/test/on-task-completed.txt"

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFile).mockResolvedValue(fileContent)

		const result = await resolveExclusiveTextOrFile({
			filePath,
			textFlagName: "--on-task-completed",
			fileFlagName: "--on-task-completed-file",
		})

		expect(result).toBe(fileContent)

		// Validate the content - should fail for whitespace-only
		if (result !== undefined) {
			const validationResult = validateOnTaskCompletedPrompt(result)
			expect(validationResult.valid).toBe(false)
			expect(validationResult.error).toBe("--on-task-completed prompt cannot be empty")
		}
	})

	it("should validate that file content respects max length of 50,000 chars", async () => {
		const maxLength = 50000
		const fileContent = "a".repeat(maxLength + 1)
		const filePath = "/test/on-task-completed.txt"

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFile).mockResolvedValue(fileContent)

		const result = await resolveExclusiveTextOrFile({
			filePath,
			textFlagName: "--on-task-completed",
			fileFlagName: "--on-task-completed-file",
		})

		expect(result).toBe(fileContent)

		// Validate the content - should fail for exceeding max length
		if (result !== undefined) {
			const validationResult = validateOnTaskCompletedPrompt(result)
			expect(validationResult.valid).toBe(false)
			expect(validationResult.error).toContain(
				"--on-task-completed prompt exceeds maximum length of 50000 characters",
			)
		}
	})

	it("should validate file content at exactly max length of 50,000 chars", async () => {
		const maxLength = 50000
		const fileContent = "a".repeat(maxLength)
		const filePath = "/test/on-task-completed.txt"

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFile).mockResolvedValue(fileContent)

		const result = await resolveExclusiveTextOrFile({
			filePath,
			textFlagName: "--on-task-completed",
			fileFlagName: "--on-task-completed-file",
		})

		expect(result).toBe(fileContent)

		// Validate the content - should pass at exactly max length
		if (result !== undefined) {
			const validationResult = validateOnTaskCompletedPrompt(result)
			expect(validationResult.valid).toBe(true)
		}
	})

	it("should validate file content with special characters and newlines", async () => {
		const fileContent = "Review the code:\n\n1. Check for bugs\n2. Add tests\n3. Update docs\n\nEnd of review."
		const filePath = "/test/on-task-completed.txt"

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFile).mockResolvedValue(fileContent)

		const result = await resolveExclusiveTextOrFile({
			filePath,
			textFlagName: "--on-task-completed",
			fileFlagName: "--on-task-completed-file",
		})

		expect(result).toBe(fileContent)

		// Validate the content - should pass with special characters and newlines
		if (result !== undefined) {
			const validationResult = validateOnTaskCompletedPrompt(result)
			expect(validationResult.valid).toBe(true)
		}
	})
})
