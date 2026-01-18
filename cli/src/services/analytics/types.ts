/**
 * Type definitions for analytics metrics collection system
 */

/**
 * Event categories for metrics classification
 */
export enum EventCategory {
	TOOL_USE = "tool_use",
	COMMAND = "command",
	TOKEN_USAGE = "token_usage",
	MESSAGE = "message",
	ERROR = "error",
}

/**
 * Structure for events stored in the event queue
 * Used for internal batching before persistence
 */
export interface MetricEvent {
	/** Event type identifier (e.g., 'tool:executed', 'command:start') */
	type: string
	/** Sanitized event data (PII removed) */
	data: Record<string, unknown>
	/** When the event occurred */
	timestamp: Date
}

/**
 * Type-safe event signatures for EventEmitter
 * Ensures compile-time type checking for event emissions
 */
export interface MetricsEvents {
	"tool:executed": {
		toolName: string
		duration: number
		success: boolean
		sessionId: string
	}
	"command:start": {
		command: string
		args: string[]
		sessionId: string
	}
	"command:complete": {
		command: string
		duration: number
		exitCode: number
		sessionId: string
	}
	"token:used": {
		model: string
		promptTokens: number
		completionTokens: number
		sessionId: string
	}
	"extension:message": {
		type: string
		hasError: boolean
		sessionId: string
	}
	"error:occurred": {
		error: string
		context: string
		sessionId: string
	}
}
