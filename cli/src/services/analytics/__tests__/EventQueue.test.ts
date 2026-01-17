/**
 * Unit tests for EventQueue ring buffer
 */

import { describe, it, expect } from "vitest"
import { EventQueue } from "../queue/EventQueue"
import type { MetricEvent } from "../types"

/**
 * Helper function to create test events
 */
function createTestEvent(id: number): MetricEvent {
	return {
		type: "test",
		data: { id },
		timestamp: new Date(),
	}
}

describe("EventQueue", () => {
	describe("enqueue", () => {
		it("enqueue adds events to queue", () => {
			const queue = new EventQueue(10)
			expect(queue.getLength()).toBe(0)

			queue.enqueue(createTestEvent(1))
			expect(queue.getLength()).toBe(1)

			queue.enqueue(createTestEvent(2))
			expect(queue.getLength()).toBe(2)
		})

		it("enqueue maintains FIFO order", () => {
			const queue = new EventQueue(10)
			queue.enqueue(createTestEvent(1))
			queue.enqueue(createTestEvent(2))
			queue.enqueue(createTestEvent(3))

			const events = queue.dequeueBatch(3)
			expect(events[0]?.data.id).toBe(1)
			expect(events[1]?.data.id).toBe(2)
			expect(events[2]?.data.id).toBe(3)
		})

		it("enqueue overwrites oldest when full", () => {
			const queue = new EventQueue(3)

			// Fill queue to capacity
			queue.enqueue(createTestEvent(1))
			queue.enqueue(createTestEvent(2))
			queue.enqueue(createTestEvent(3))
			expect(queue.getLength()).toBe(3)

			// Add one more - should overwrite event 1
			queue.enqueue(createTestEvent(4))
			expect(queue.getLength()).toBe(3) // Size remains at capacity

			const events = queue.dequeueBatch(3)
			expect(events.length).toBe(3)
			expect(events[0]?.data.id).toBe(2) // Event 1 was overwritten
			expect(events[1]?.data.id).toBe(3)
			expect(events[2]?.data.id).toBe(4)
		})

		it("ring buffer wraparound works correctly", () => {
			const queue = new EventQueue(3)

			// Fill and drain multiple times
			for (let cycle = 0; cycle < 3; cycle++) {
				queue.enqueue(createTestEvent(cycle * 3 + 1))
				queue.enqueue(createTestEvent(cycle * 3 + 2))
				queue.enqueue(createTestEvent(cycle * 3 + 3))

				const events = queue.dequeueBatch(3)
				expect(events[0]?.data.id).toBe(cycle * 3 + 1)
				expect(events[1]?.data.id).toBe(cycle * 3 + 2)
				expect(events[2]?.data.id).toBe(cycle * 3 + 3)
			}

			// After multiple cycles, queue still works
			queue.enqueue(createTestEvent(10))
			expect(queue.getLength()).toBe(1)
		})
	})

	describe("dequeueBatch", () => {
		it("dequeueBatch removes events in FIFO order", () => {
			const queue = new EventQueue(10)
			queue.enqueue(createTestEvent(1))
			queue.enqueue(createTestEvent(2))
			queue.enqueue(createTestEvent(3))
			queue.enqueue(createTestEvent(4))
			queue.enqueue(createTestEvent(5))

			const events = queue.dequeueBatch(3)
			expect(events.length).toBe(3)
			expect(events[0]?.data.id).toBe(1)
			expect(events[1]?.data.id).toBe(2)
			expect(events[2]?.data.id).toBe(3)
			expect(queue.getLength()).toBe(2) // 4 and 5 remain
		})

		it("dequeueBatch respects batchSize limit", () => {
			const queue = new EventQueue(10)
			for (let i = 1; i <= 10; i++) {
				queue.enqueue(createTestEvent(i))
			}

			const events = queue.dequeueBatch(5)
			expect(events.length).toBe(5)
			expect(queue.getLength()).toBe(5) // 5 events remain
		})

		it("dequeueBatch returns empty array when queue empty", () => {
			const queue = new EventQueue(10)
			const events = queue.dequeueBatch(5)
			expect(events).toEqual([])
			expect(events.length).toBe(0)
		})

		it("dequeueBatch updates size correctly", () => {
			const queue = new EventQueue(10)
			for (let i = 1; i <= 5; i++) {
				queue.enqueue(createTestEvent(i))
			}
			expect(queue.getLength()).toBe(5)

			queue.dequeueBatch(3)
			expect(queue.getLength()).toBe(2)

			queue.dequeueBatch(2)
			expect(queue.getLength()).toBe(0)
		})
	})

	describe("requeue", () => {
		it("requeue adds events back to queue", () => {
			const queue = new EventQueue(10)
			queue.enqueue(createTestEvent(1))
			queue.enqueue(createTestEvent(2))
			queue.enqueue(createTestEvent(3))

			const events = queue.dequeueBatch(3)
			expect(queue.getLength()).toBe(0)

			queue.requeue(events)
			expect(queue.getLength()).toBe(3)

			const requeuedEvents = queue.dequeueBatch(3)
			expect(requeuedEvents[0]?.data.id).toBe(1)
			expect(requeuedEvents[1]?.data.id).toBe(2)
			expect(requeuedEvents[2]?.data.id).toBe(3)
		})

		it("requeue maintains order", () => {
			const queue = new EventQueue(10)
			queue.enqueue(createTestEvent(1))
			queue.enqueue(createTestEvent(2))

			const events = queue.dequeueBatch(2)
			queue.requeue(events)

			const requeuedEvents = queue.dequeueBatch(2)
			expect(requeuedEvents[0]?.data.id).toBe(1)
			expect(requeuedEvents[1]?.data.id).toBe(2)
		})

		it("requeue after partial dequeue", () => {
			const queue = new EventQueue(10)
			for (let i = 1; i <= 5; i++) {
				queue.enqueue(createTestEvent(i))
			}

			const batch = queue.dequeueBatch(3) // Events 1, 2, 3
			expect(queue.getLength()).toBe(2) // Events 4, 5 remain

			queue.requeue(batch) // Re-add 1, 2, 3
			expect(queue.getLength()).toBe(5)

			const events = queue.dequeueBatch(5)
			expect(events[0]?.data.id).toBe(4) // Original remaining events first
			expect(events[1]?.data.id).toBe(5)
			expect(events[2]?.data.id).toBe(1) // Requeued events
			expect(events[3]?.data.id).toBe(2)
			expect(events[4]?.data.id).toBe(3)
		})
	})

	describe("getLength", () => {
		it("getLength returns current size", () => {
			const queue = new EventQueue(10)
			expect(queue.getLength()).toBe(0)

			queue.enqueue(createTestEvent(1))
			expect(queue.getLength()).toBe(1)

			queue.enqueue(createTestEvent(2))
			expect(queue.getLength()).toBe(2)

			queue.dequeueBatch(1)
			expect(queue.getLength()).toBe(1)
		})
	})

	describe("isEmpty", () => {
		it("isEmpty returns true when empty", () => {
			const queue = new EventQueue(10)
			expect(queue.isEmpty()).toBe(true)
		})

		it("isEmpty returns false when has events", () => {
			const queue = new EventQueue(10)
			queue.enqueue(createTestEvent(1))
			expect(queue.isEmpty()).toBe(false)
		})

		it("isEmpty returns true after dequeueing all events", () => {
			const queue = new EventQueue(10)
			queue.enqueue(createTestEvent(1))
			queue.enqueue(createTestEvent(2))

			queue.dequeueBatch(2)
			expect(queue.isEmpty()).toBe(true)
		})
	})

	describe("isFull", () => {
		it("isFull returns true when at capacity", () => {
			const queue = new EventQueue(3)
			queue.enqueue(createTestEvent(1))
			queue.enqueue(createTestEvent(2))
			queue.enqueue(createTestEvent(3))

			expect(queue.isFull()).toBe(true)
		})

		it("isFull returns false when not full", () => {
			const queue = new EventQueue(10)
			queue.enqueue(createTestEvent(1))
			expect(queue.isFull()).toBe(false)

			queue.enqueue(createTestEvent(2))
			expect(queue.isFull()).toBe(false)
		})

		it("isFull returns false after dequeueing from full queue", () => {
			const queue = new EventQueue(3)
			queue.enqueue(createTestEvent(1))
			queue.enqueue(createTestEvent(2))
			queue.enqueue(createTestEvent(3))

			expect(queue.isFull()).toBe(true)

			queue.dequeueBatch(1)
			expect(queue.isFull()).toBe(false)
		})
	})

	describe("capacity and memory limits", () => {
		it("capacity of 1000 prevents memory leaks", () => {
			const queue = new EventQueue(1000)

			// Add 2000 events (2x capacity)
			for (let i = 1; i <= 2000; i++) {
				queue.enqueue(createTestEvent(i))
			}

			// Size should never exceed 1000
			expect(queue.getLength()).toBe(1000)
			expect(queue.isFull()).toBe(true)

			// Oldest 1000 events should have been overwritten
			// Only events 1001-2000 remain
			const remaining = queue.dequeueBatch(1000)
			expect(remaining[0]?.data.id).toBe(1001)
			expect(remaining[999]?.data.id).toBe(2000)
		})
	})

	describe("constructor validation", () => {
		it("constructor throws on zero capacity", () => {
			expect(() => new EventQueue(0)).toThrow("capacity must be greater than 0")
		})

		it("constructor throws on negative capacity", () => {
			expect(() => new EventQueue(-1)).toThrow("capacity must be greater than 0")
		})

		it("constructor accepts valid capacities", () => {
			expect(() => new EventQueue(1)).not.toThrow()
			expect(() => new EventQueue(100)).not.toThrow()
			expect(() => new EventQueue(10000)).not.toThrow()
		})
	})
})
