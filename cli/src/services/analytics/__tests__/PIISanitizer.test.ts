/**
 * Unit tests for PIISanitizer
 */

import { describe, it, expect } from "vitest"
import { PIISanitizer } from "../sanitization/PIISanitizer"

describe("PIISanitizer", () => {
	describe("hashUsername", () => {
		it("produces consistent SHA-256 hash", () => {
			const username = "testuser"
			const hash1 = PIISanitizer.hashUsername(username)
			const hash2 = PIISanitizer.hashUsername(username)

			expect(hash1).toBe(hash2)
		})

		it("produces different hashes for different usernames", () => {
			const hash1 = PIISanitizer.hashUsername("user1")
			const hash2 = PIISanitizer.hashUsername("user2")

			expect(hash1).not.toBe(hash2)
		})

		it("produces 16-character hexadecimal hash", () => {
			const hash = PIISanitizer.hashUsername("testuser")

			expect(hash).toHaveLength(16)
			expect(/^[0-9a-f]{16}$/.test(hash)).toBe(true)
		})
	})

	describe("sanitizeString", () => {
		it("hashes Unix usernames in /users path", () => {
			const input = "/users/testuser/Documents/file.txt"
			const result = PIISanitizer.sanitizeString(input)

			expect(result).toContain("/users/")
			expect(result).not.toContain("testuser")
			expect(result).toMatch(/\/users\/[0-9a-f]{16}\//)
		})

		it("hashes Linux usernames in /home path", () => {
			const input = "/home/testuser/Documents/file.txt"
			const result = PIISanitizer.sanitizeString(input)

			expect(result).toContain("/home/")
			expect(result).not.toContain("testuser")
			expect(result).toMatch(/\/home\/[0-9a-f]{16}\//)
		})

		it("hashes Windows usernames in C:\\Users path", () => {
			const input = "C:\\Users\\testuser\\Documents\\file.txt"
			const result = PIISanitizer.sanitizeString(input)

			expect(result).toContain("C:\\Users\\")
			expect(result).not.toContain("testuser")
			expect(result).toMatch(/C:\\Users\\[0-9a-f]{16}\\/)
		})

		it("redacts password patterns", () => {
			const result = PIISanitizer.sanitizeString("my password is secret123")
			expect(result).toBe("[REDACTED]")
		})

		it("redacts api_key patterns", () => {
			const result = PIISanitizer.sanitizeString("api_key: abc123def456")
			expect(result).toBe("[REDACTED]")
		})

		it("redacts api-key patterns", () => {
			const result = PIISanitizer.sanitizeString("api-key: abc123def456")
			expect(result).toBe("[REDACTED]")
		})

		it("redacts token patterns", () => {
			const result = PIISanitizer.sanitizeString("token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")
			expect(result).toBe("[REDACTED]")
		})

		it("redacts secret patterns", () => {
			const result = PIISanitizer.sanitizeString("secret: mysecretvalue")
			expect(result).toBe("[REDACTED]")
		})

		it("returns unchanged string if no PII detected", () => {
			const input = "This is a clean string with no sensitive data"
			const result = PIISanitizer.sanitizeString(input)

			expect(result).toBe(input)
		})

		it("is case-insensitive for sensitive patterns", () => {
			expect(PIISanitizer.sanitizeString("PASSWORD: test")).toBe("[REDACTED]")
			expect(PIISanitizer.sanitizeString("API_KEY: test")).toBe("[REDACTED]")
			expect(PIISanitizer.sanitizeString("TOKEN: test")).toBe("[REDACTED]")
			expect(PIISanitizer.sanitizeString("SECRET: test")).toBe("[REDACTED]")
		})
	})

	describe("sanitize", () => {
		it("recursively sanitizes nested objects", () => {
			const input = {
				path: "/users/testuser/file.txt",
				nested: {
					homePath: "/home/testuser/Documents",
				},
			}

			const result = PIISanitizer.sanitize(input)

			expect(result.path).not.toContain("testuser")
			expect(result.nested.homePath).not.toContain("testuser")
		})

		it("sanitizes string values in objects", () => {
			const input = {
				path: "/users/testuser/file.txt",
				other: "normal string",
			}

			const result = PIISanitizer.sanitize(input)

			expect(result.path).not.toContain("testuser")
			expect(result.other).toBe("normal string")
		})

		it("sanitizes string elements in arrays", () => {
			const input = {
				paths: ["/users/testuser/file1.txt", "/users/testuser/file2.txt"],
			}

			const result = PIISanitizer.sanitize(input)

			expect(result.paths[0]).not.toContain("testuser")
			expect(result.paths[1]).not.toContain("testuser")
		})

		it("sanitizes nested objects in arrays", () => {
			const input = {
				items: [{ path: "/users/testuser/file.txt" }, { path: "/home/anotheruser/file.txt" }],
			}

			const result = PIISanitizer.sanitize(input)

			expect(result.items[0].path).not.toContain("testuser")
			expect(result.items[1].path).not.toContain("anotheruser")
		})

		it("preserves non-string primitive values", () => {
			const input = {
				number: 42,
				boolean: true,
				null: null,
			}

			const result = PIISanitizer.sanitize(input)

			expect(result.number).toBe(42)
			expect(result.boolean).toBe(true)
			expect(result.null).toBe(null)
		})

		it("returns unchanged object if no PII detected", () => {
			const input = {
				name: "test",
				value: 123,
				active: true,
			}

			const result = PIISanitizer.sanitize(input)

			expect(result).toEqual(input)
		})

		it("handles empty objects", () => {
			const input = {}
			const result = PIISanitizer.sanitize(input)

			expect(result).toEqual({})
		})

		it("handles empty arrays", () => {
			const input = { items: [] }
			const result = PIISanitizer.sanitize(input)

			expect(result).toEqual({ items: [] })
		})

		it("handles null values", () => {
			const input = { value: null }
			const result = PIISanitizer.sanitize(input)

			expect(result).toEqual({ value: null })
		})
	})
})
