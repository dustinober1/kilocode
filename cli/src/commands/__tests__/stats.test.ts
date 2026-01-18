/**
 * Tests for the /stats command
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { statsCommand } from "../stats.js"
import type { CommandContext } from "../core/types.js"
import { createMockContext } from "./helpers/mockContext.js"

describe("statsCommand", () => {
	let mockContext: CommandContext

	beforeEach(() => {
		mockContext = createMockContext({
			input: "/stats",
		})
	})

	describe("command metadata", () => {
		it("should have correct name", () => {
			expect(statsCommand.name).toBe("stats")
		})

		it("should have aliases", () => {
			expect(statsCommand.aliases).toEqual(["dashboard", "analytics"])
		})

		it("should have correct category", () => {
			expect(statsCommand.category).toBe("system")
		})

		it("should have correct priority", () => {
			expect(statsCommand.priority).toBe(5)
		})

		it("should have description", () => {
			expect(statsCommand.description).toBeTruthy()
			expect(statsCommand.description.toLowerCase()).toContain("analytics")
		})

		it("should have usage examples", () => {
			expect(statsCommand.examples).toHaveLength(1)
			expect(statsCommand.examples).toContain("/stats")
		})

		it("should have correct usage string", () => {
			expect(statsCommand.usage).toBe("/stats")
		})
	})

	describe("handler", () => {
		it("should add system message", async () => {
			await statsCommand.handler(mockContext)

			expect(mockContext.addMessage).toHaveBeenCalledTimes(1)
			const addedMessage = (mockContext.addMessage as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(addedMessage.type).toBe("system")
		})

		it("should include dashboard emoji in message", async () => {
			await statsCommand.handler(mockContext)

			expect(mockContext.addMessage).toHaveBeenCalledTimes(1)
			const addedMessage = (mockContext.addMessage as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(addedMessage.content).toContain("📊")
		})

		it("should mention analytics dashboard", async () => {
			await statsCommand.handler(mockContext)

			expect(mockContext.addMessage).toHaveBeenCalledTimes(1)
			const addedMessage = (mockContext.addMessage as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(addedMessage.content).toContain("Analytics")
		})

		it("should mention real-time metrics", async () => {
			await statsCommand.handler(mockContext)

			expect(mockContext.addMessage).toHaveBeenCalledTimes(1)
			const addedMessage = (mockContext.addMessage as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(addedMessage.content).toMatch(/metrics|token|history/i)
		})

		it("should mention placeholder status", async () => {
			await statsCommand.handler(mockContext)

			expect(mockContext.addMessage).toHaveBeenCalledTimes(1)
			const addedMessage = (mockContext.addMessage as ReturnType<typeof vi.fn>).mock.calls[0][0]
			expect(addedMessage.content).toMatch(/placeholder|coming|integration/i)
		})

		it("should execute without errors", async () => {
			await expect(statsCommand.handler(mockContext)).resolves.not.toThrow()
		})

		it("should work with alias 'dashboard'", async () => {
			const dashboardContext = createMockContext({
				input: "/dashboard",
			})

			await expect(statsCommand.handler(dashboardContext)).resolves.not.toThrow()
			expect(dashboardContext.addMessage).toHaveBeenCalledTimes(1)
		})

		it("should work with alias 'analytics'", async () => {
			const analyticsContext = createMockContext({
				input: "/analytics",
			})

			await expect(statsCommand.handler(analyticsContext)).resolves.not.toThrow()
			expect(analyticsContext.addMessage).toHaveBeenCalledTimes(1)
		})
	})
})
