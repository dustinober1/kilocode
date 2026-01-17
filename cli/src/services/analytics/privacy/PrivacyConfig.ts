/**
 * Privacy configuration for analytics metrics collection
 * User-configurable settings for PII handling and data collection preferences
 */

/**
 * Privacy configuration interface
 * Controls how analytics data is collected and sanitized
 */
export interface PrivacyConfig {
	/** Whether analytics is enabled */
	enabled: boolean

	/** Whether to hash PII (usernames, paths) */
	hashPII: boolean

	/** Whether to filter prompts for sensitive data */
	filterPrompts: boolean

	/** Patterns to redact from paths */
	pathPatterns: RegExp[]

	/** Patterns to redact from prompts */
	promptPatterns: RegExp[]
}

/**
 * Default privacy configuration
 * Privacy-first: hashing and filtering enabled by default
 */
export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
	enabled: true,
	hashPII: true,
	filterPrompts: true,
	pathPatterns: [/\/users\/([^/]+)/gi, /\/home\/([^/]+)/gi, /C:\\Users\\([^\\]+)/gi],
	promptPatterns: [/password/gi, /api[_-]?key/gi, /token/gi, /secret/gi],
}
