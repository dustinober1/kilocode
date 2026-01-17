/**
 * PII (Personal Identifiable Information) sanitization utilities
 * Uses SHA-256 hashing to anonymize sensitive data before storage
 */

import { createHash } from "crypto"

/**
 * PII sanitization service
 * Provides static methods for hashing sensitive data like usernames and filtering prompts
 */
export class PIISanitizer {
	/** Username patterns to hash in filesystem paths */
	private static readonly USERNAME_PATTERNS = [/\/users\/([^/]+)/gi, /\/home\/([^/]+)/gi, /C:\\Users\\([^\\]+)/gi]

	/** Sensitive prompt patterns to redact entirely */
	private static readonly PROMPT_PATTERNS = [/password/gi, /api[_-]?key/gi, /token/gi, /secret/gi]

	/**
	 * Recursively sanitize an object by hashing PII in strings and nested objects
	 * @param data - The object to sanitize
	 * @returns A new object with PII hashed or redacted
	 */
	public static sanitize(data: Record<string, unknown>): Record<string, unknown> {
		const sanitized: Record<string, unknown> = {}

		for (const key in data) {
			const value = data[key]

			if (typeof value === "string") {
				sanitized[key] = this.sanitizeString(value)
			} else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
				// Recursively sanitize nested objects
				sanitized[key] = this.sanitize(value as Record<string, unknown>)
			} else if (Array.isArray(value)) {
				// Handle arrays by sanitizing each element
				sanitized[key] = value.map((item) => {
					if (typeof item === "string") {
						return this.sanitizeString(item)
					} else if (typeof item === "object" && item !== null) {
						return this.sanitize(item as Record<string, unknown>)
					}
					return item
				})
			} else {
				// Keep primitive values as-is
				sanitized[key] = value
			}
		}

		return sanitized
	}

	/**
	 * Sanitize an individual string
	 * - Hashes usernames in filesystem paths
	 * - Redacts entire string if sensitive patterns detected
	 * @param str - The string to sanitize
	 * @returns Sanitized string with hashed usernames or [REDACTED]
	 */
	public static sanitizeString(str: string): string {
		let sanitized = str

		// Check for sensitive prompt patterns first (redact entire string)
		for (const pattern of this.PROMPT_PATTERNS) {
			if (pattern.test(sanitized)) {
				return "[REDACTED]"
			}
		}

		// Hash usernames in paths
		for (const pattern of this.USERNAME_PATTERNS) {
			sanitized = sanitized.replace(pattern, (match, username) => {
				const hash = this.hashUsername(username)
				return match.replace(username, hash)
			})
		}

		return sanitized
	}

	/**
	 * Hash a username using SHA-256 and return first 16 hex characters
	 * @param username - The username to hash
	 * @returns 16-character hexadecimal hash
	 */
	public static hashUsername(username: string): string {
		return createHash("sha256").update(username, "utf8").digest("hex").substring(0, 16)
	}
}
