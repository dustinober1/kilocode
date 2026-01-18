/**
 * Tests for the /export command
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { exportCommand } from "../export.js"
import type { CommandContext } from "../core/types.js"
import { createMockContext } from "./helpers/mockContext.js"

// Mock ReportGenerator
vi.mock("../../services/analytics/ReportGenerator.js", () => {
	const mockExportData = {
		version: "1.0.0",
		exportedAt: "2025-01-18T00:00:00.000Z",
		privacyConfig: {
			enabled: true,
			hashPII: true,
			filterPrompts: true,
		},
		sessions: [
			{
				id: "session-1",
				startTime: "2025-01-18T00:00:00.000Z",
				endTime: "2025-01-18T01:00:00.000Z",
				totalTokens: 1000,
				totalCost: 500,
				commandCount: 10,
				toolUsageCount: 50,
				exitReason: "user_exit",
				events: [],
			},
		],
	}

	const mockReportGenerator = {
		getInstance: vi.fn(() => mockReportGenerator),
		generateFullExport: vi.fn().mockResolvedValue(mockExportData),
		exportToJsonFile: vi.fn().mockResolvedValue(undefined),
	}

	return {
		default: mockReportGenerator,
	}
})

const ReportGenerator = await import("../../services/analytics/ReportGenerator.js")

// Mock fs.stat for file size calculation
vi.mock("fs/promises", () => ({
	stat: vi.fn().mockResolvedValue({ size: 2048 }), // 2KB file
}))

describe("exportCommand", () => {
	let mockContext: CommandContext

	beforeEach(() => {
		vi.clearAllMocks()
		mockContext = createMockContext({
			input: "/export",
			options: {},
		})
	})

	describe("command metadata", () => {
		it("should have correct name", () => {
			expect(exportCommand.name).toBe("export")
		})

		it("should have aliases", () => {
			expect(exportCommand.aliases).toEqual(["download", "backup"])
		})

		it("should have correct category", () => {
			expect(exportCommand.category).toBe("system")
		})

		it("should have correct priority", () => {
			expect(exportCommand.priority).toBe(5)
		})

		it("should have description", () => {
			expect(exportCommand.description).toBeTruthy()
			expect(exportCommand.description.toLowerCase()).toContain("export")
		})

		it("should have usage examples", () => {
			expect(exportCommand.examples).toHaveLength(4)
			expect(exportCommand.examples).toContain("/export")
			expect(exportCommand.examples).toContain("/export --output ~/backup.json")
			expect(exportCommand.examples).toContain("/download")
			expect(exportCommand.examples).toContain("/backup")
		})

		it("should have correct usage string", () => {
			expect(exportCommand.usage).toBe("/export [--output <path>]")
		})

		it("should have output option", () => {
			expect(exportCommand.options).toHaveLength(1)
			expect(exportCommand.options?.[0].name).toBe("output")
			expect(exportCommand.options?.[0].alias).toBe("o")
		})
	})

	describe("handler", () => {
		it("should export to default path when no option provided", async () => {
			await exportCommand.handler(mockContext)

			// Verify exportToJsonFile was called with default path
			expect(ReportGenerator.default.exportToJsonFile).toHaveBeenCalledTimes(1)
			const callArgs = (ReportGenerator.default.exportToJsonFile as ReturnType<typeof vi.fn>).mock.calls[0]
			expect(callArgs[1]).toContain("kilocode-analytics-export.json")
		})

		it("should export to custom path with --output option", async () => {
			const customPath = "/custom/path/backup.json"
			const customContext = createMockContext({
				input: "/export",
				options: { output: customPath },
			})

			await exportCommand.handler(customContext)

			// Verify exportToJsonFile was called with custom path
			expect(ReportGenerator.default.exportToJsonFile).toHaveBeenCalledWith(expect.anything(), customPath)
		})

		it("should show success message with file path", async () => {
			await exportCommand.handler(mockContext)

			expect(mockContext.addMessage).toHaveBeenCalledTimes(1)
			const addedMessage = (mockContext.addMessage as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(addedMessage.type).toBe("system")
			expect(addedMessage.content).toContain("Export complete")
			expect(addedMessage.content).toContain("kilocode-analytics-export.json")
		})

		it("should include session count in success message", async () => {
			await exportCommand.handler(mockContext)

			expect(mockContext.addMessage).toHaveBeenCalledTimes(1)
			const addedMessage = (mockContext.addMessage as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(addedMessage.content).toContain("1 session")
		})

		it("should include file size in success message", async () => {
			await exportCommand.handler(mockContext)

			expect(mockContext.addMessage).toHaveBeenCalledTimes(1)
			const addedMessage = (mockContext.addMessage as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(addedMessage.content).toMatch(/2\.0 KB/)
		})

		it("should handle errors gracefully", async () => {
			// Mock generateFullExport to throw an error
			const errorContext = createMockContext({
				input: "/export",
				options: {},
			})

			;(ReportGenerator.default.generateFullExport as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error("Database connection failed"),
			)

			await exportCommand.handler(errorContext)

			// Should not throw, but show error message
			expect(errorContext.addMessage).toHaveBeenCalledTimes(1)
			const addedMessage = (errorContext.addMessage as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(addedMessage.type).toBe("system")
			expect(addedMessage.content).toContain("Export failed")
			expect(addedMessage.content).toContain("Database connection failed")
		})

		it("should handle multiple sessions in count", async () => {
			// Modify the mock to return multiple sessions
			const originalMock = ReportGenerator.default.generateFullExport
			;(ReportGenerator.default.generateFullExport as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				version: "1.0.0",
				exportedAt: "2025-01-18T00:00:00.000Z",
				privacyConfig: {
					enabled: true,
					hashPII: true,
					filterPrompts: true,
				},
				sessions: [
					{
						id: "s1",
						startTime: "",
						endTime: null,
						totalTokens: 0,
						totalCost: 0,
						commandCount: 0,
						toolUsageCount: 0,
						exitReason: null,
						events: [],
					},
					{
						id: "s2",
						startTime: "",
						endTime: null,
						totalTokens: 0,
						totalCost: 0,
						commandCount: 0,
						toolUsageCount: 0,
						exitReason: null,
						events: [],
					},
					{
						id: "s3",
						startTime: "",
						endTime: null,
						totalTokens: 0,
						totalCost: 0,
						commandCount: 0,
						toolUsageCount: 0,
						exitReason: null,
						events: [],
					},
				],
			})

			await exportCommand.handler(mockContext)

			const addedMessage = (mockContext.addMessage as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(addedMessage.content).toContain("3 sessions")

			// Restore original mock
			;(ReportGenerator.default.generateFullExport as ReturnType<typeof vi.fn>).mockImplementation(originalMock)
		})

		it("should execute without errors in happy path", async () => {
			await expect(exportCommand.handler(mockContext)).resolves.not.toThrow()
		})
	})
})
