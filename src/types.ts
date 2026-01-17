export interface AnalyticsEvent {
	id?: number
	timestamp: number
	eventType: string
	payload: string // Store stringified JSON
}

export interface WorkerMessage {
	type: "insert" | "bulk_insert" | "query" | "initialize" | "close"
	data?: any
}

export interface WorkerResponse {
	success: boolean
	data?: any
	error?: string
}
