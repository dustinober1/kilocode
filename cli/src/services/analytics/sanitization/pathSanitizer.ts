/**
 * Path-specific sanitization utilities
 * Handles filesystem path PII removal while preserving path structure
 */

import { PIISanitizer } from "./PIISanitizer"

/**
 * Sanitize a filesystem path by hashing usernames
 * Preserves the path structure, only replacing username components
 * @param path - The filesystem path to sanitize
 * @returns Path with usernames replaced by SHA-256 hashes
 */
export function sanitizePath(path: string): string {
	// Reuse PIISanitizer's string sanitization which handles username hashing
	return PIISanitizer.sanitizeString(path)
}
