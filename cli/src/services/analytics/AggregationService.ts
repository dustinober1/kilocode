/**
 * AggregationService - SQL aggregation queries for session analytics
 *
 * Provides efficient SQL queries using window functions and aggregation.
 * All query results are cached with 5-second TTL for performance.
 */

import { sql } from "drizzle-orm"
import StorageService from "./StorageService"
import { aggregationCache } from "./QueryCache"

// Type definitions for query results
export interface SessionMetrics {
	eventCount: number
	totalCost: number
	firstEvent: Date | null
	lastEvent: Date | null
}

export interface TokenUsagePoint {
	timestamp: Date
	tokens: number
	runningTotal: number
}

export interface TokenPerMinute {
	minute: string
	tokens: number
}

export interface SessionListItem {
	id: string
	startTime: Date
	endTime: Date | null
	totalTokens: number
	totalCost: number
	commandCount: number
	toolUsageCount: number
	exitReason: string | null
}

class AggregationService {
	private static instance: AggregationService
	private db: ReturnType<typeof StorageService.prototype.getDatabase>

	private constructor() {
		this.db = StorageService.getInstance().getDatabase()
	}

	public static getInstance(): AggregationService {
		if (!AggregationService.instance) {
			AggregationService.instance = new AggregationService()
		}
		return AggregationService.instance
	}

	/**
	 * Get aggregated metrics for a specific session
	 * Returns event counts, total cost, and time range
	 */
	async getSessionMetrics(sessionId: string): Promise<SessionMetrics> {
		const cacheKey = `${sessionId}:metrics`
		const cached = aggregationCache.get<SessionMetrics>(cacheKey)

		if (cached) {
			return cached
		}

		const result = await this.db.execute(
			sql`
        SELECT
          COUNT(*) as event_count,
          SUM(CAST(json_extract(metadata, '$.cost') AS INTEGER)) as total_cost,
          MIN(timestamp) as first_event,
          MAX(timestamp) as last_event
        FROM metric_events
        WHERE session_id = ${sessionId}
      `,
		)

		const row = result.rows[0] as unknown as {
			event_count: number
			total_cost: number | null
			first_event: string | null
			last_event: string | null
		}

		const metrics: SessionMetrics = {
			eventCount: row?.event_count || 0,
			totalCost: row?.total_cost || 0,
			firstEvent: row?.first_event ? new Date(row.first_event) : null,
			lastEvent: row?.last_event ? new Date(row.last_event) : null,
		}

		aggregationCache.set(cacheKey, metrics)
		return metrics
	}

	/**
	 * Get token usage timeline with running totals
	 * Uses window function for efficient cumulative sum calculation
	 */
	async getTokenUsageTimeline(sessionId: string): Promise<TokenUsagePoint[]> {
		const cacheKey = `${sessionId}:token-timeline`
		const cached = aggregationCache.get<TokenUsagePoint[]>(cacheKey)

		if (cached) {
			return cached
		}

		const result = await this.db.execute(
			sql`
        SELECT
          timestamp,
          CAST(json_extract(metadata, '$.promptTokens') AS INTEGER) +
          CAST(json_extract(metadata, '$.completionTokens') AS INTEGER) as tokens,
          SUM(
            CAST(json_extract(metadata, '$.promptTokens') AS INTEGER) +
            CAST(json_extract(metadata, '$.completionTokens') AS INTEGER)
          ) OVER (
            ORDER BY timestamp
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) as running_total
        FROM metric_events
        WHERE session_id = ${sessionId}
          AND event_type = 'token:used'
        ORDER BY timestamp DESC
        LIMIT 100
      `,
		)

		const timeline: TokenUsagePoint[] = result.rows
			.map(
				(row) =>
					row as unknown as TokenUsagePoint & {
						timestamp: string
					},
			)
			.map((row) => ({
				timestamp: new Date(row.timestamp),
				tokens: row.tokens,
				runningTotal: row.runningTotal,
			}))

		aggregationCache.set(cacheKey, timeline)
		return timeline
	}

	/**
	 * Get list of historical sessions
	 * Returns most recent sessions sorted by start time
	 */
	async getHistoricalSessions(limit: number = 20): Promise<SessionListItem[]> {
		const cacheKey = `historical:${limit}`
		const cached = aggregationCache.get<SessionListItem[]>(cacheKey)

		if (cached) {
			return cached
		}

		const result = await this.db.execute(
			sql`
        SELECT
          id,
          start_time,
          end_time,
          total_tokens,
          total_cost,
          command_count,
          tool_usage_count,
          exit_reason
        FROM sessions
        ORDER BY start_time DESC
        LIMIT ${limit}
      `,
		)

		const sessions: SessionListItem[] = result.rows
			.map(
				(row) =>
					row as unknown as SessionListItem & {
						start_time: string
						end_time: string | null
					},
			)
			.map((row) => ({
				id: row.id,
				startTime: new Date(row.start_time),
				endTime: row.end_time ? new Date(row.end_time) : null,
				totalTokens: row.total_tokens,
				totalCost: row.total_cost,
				commandCount: row.command_count,
				toolUsageCount: row.tool_usage_count,
				exitReason: row.exit_reason,
			}))

		aggregationCache.set(cacheKey, sessions)
		return sessions
	}

	/**
	 * Get tokens used per minute for a session
	 * Uses time bucketing for efficient aggregation
	 */
	async getTokensPerMinute(sessionId: string): Promise<TokenPerMinute[]> {
		const cacheKey = `${sessionId}:tokens-per-minute`
		const cached = aggregationCache.get<TokenPerMinute[]>(cacheKey)

		if (cached) {
			return cached
		}

		const result = await this.db.execute(
			sql`
        SELECT
          strftime('%Y-%m-%d %H:%M', timestamp) as minute,
          SUM(
            CAST(json_extract(metadata, '$.promptTokens') AS INTEGER) +
            CAST(json_extract(metadata, '$.completionTokens') AS INTEGER)
          ) as tokens
        FROM metric_events
        WHERE session_id = ${sessionId}
          AND event_type = 'token:used'
        GROUP BY minute
        ORDER BY minute
      `,
		)

		const tokensPerMinute: TokenPerMinute[] = result.rows as unknown as TokenPerMinute[]

		aggregationCache.set(cacheKey, tokensPerMinute)
		return tokensPerMinute
	}
}

export default AggregationService
