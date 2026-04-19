import { expect, test } from '@jest/globals'
import { getToolCallResults } from '../src/parts/GetToolCallResults/GetToolCallResults.ts'

test('getToolCallResults should return an empty array for an empty tool call list', async () => {
  const result = await getToolCallResults([])

  expect(result).toEqual([])
})

test('getToolCallResults should not mutate the provided tool calls', async () => {
  const toolCalls = [{ args: { query: 'status' }, id: 'tool_1' }]

  const result = await getToolCallResults(toolCalls)

  expect(result).toEqual([])
  expect(toolCalls).toEqual([{ args: { query: 'status' }, id: 'tool_1' }])
})
