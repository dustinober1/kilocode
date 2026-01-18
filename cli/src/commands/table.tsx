import React from "react"
import { render, Text } from "ink"
import Table from "ink-table"
import { Command } from "commander"

interface TableRow {
	name: string
	age: number
	city: string
	[key: string]: string | number // Index signature for ink-table compatibility
}

const data: TableRow[] = [
	{ name: "Alice", age: 30, city: "New York" },
	{ name: "Bob", age: 24, city: "Los Angeles" },
	{ name: "Charlie", age: 35, city: "Chicago" },
]

const TableComponent = () => {
	return (
		<>
			<Text>Here is some sample data:</Text>
			<Table data={data} />
		</>
	)
}

export const tableCommand = new Command("table").description("Display a sample table using ink-table").action(() => {
	render(<TableComponent />)
})
