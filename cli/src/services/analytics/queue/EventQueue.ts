/**
 * Fixed-size ring buffer queue for event batching
 * Prevents memory leaks by overwriting oldest events when capacity is reached
 */

import type { MetricEvent } from "../types"

export class EventQueue {
	private buffer: MetricEvent[]
	private head: number
	private tail: number
	private size: number
	private readonly capacity: number

	/**
	 * Create a new ring buffer queue
	 * @param capacity - Maximum number of events (default: 1000)
	 * @throws {Error} If capacity is 0 or negative
	 */
	constructor(capacity: number = 1000) {
		if (capacity <= 0) {
			throw new Error(`EventQueue capacity must be greater than 0, got ${capacity}`)
		}

		this.capacity = capacity
		this.buffer = new Array(capacity)
		this.head = 0
		this.tail = 0
		this.size = 0
	}

	/**
	 * Add an event to the queue
	 * If queue is full, overwrites the oldest event (ring buffer behavior)
	 * @param event - The event to enqueue
	 */
	public enqueue(event: MetricEvent): void {
		if (this.size === this.capacity) {
			// Overwrite oldest: move head forward
			this.head = (this.head + 1) % this.capacity
		} else {
			this.size++
		}

		this.buffer[this.tail] = event
		this.tail = (this.tail + 1) % this.capacity
	}

	/**
	 * Remove up to batchSize events from the queue in FIFO order
	 * @param batchSize - Maximum number of events to dequeue
	 * @returns Array of dequeued events (may be empty)
	 */
	public dequeueBatch(batchSize: number): MetricEvent[] {
		const result: MetricEvent[] = []

		for (let i = 0; i < batchSize && this.size > 0; i++) {
			// Use non-null assertion since we check size > 0
			result.push(this.buffer[this.head]!)
			this.head = (this.head + 1) % this.capacity
			this.size--
		}

		return result
	}

	/**
	 * Add events back to the front of the queue
	 * Used for retrying failed batch operations
	 * @param events - Events to requeue
	 */
	public requeue(events: MetricEvent[]): void {
		for (const event of events) {
			this.enqueue(event)
		}
	}

	/**
	 * Get the current number of events in the queue
	 * @returns Current queue size
	 */
	public getLength(): number {
		return this.size
	}

	/**
	 * Check if the queue is empty
	 * @returns true if queue has no events
	 */
	public isEmpty(): boolean {
		return this.size === 0
	}

	/**
	 * Check if the queue is at full capacity
	 * @returns true if queue is full
	 */
	public isFull(): boolean {
		return this.size === this.capacity
	}
}
