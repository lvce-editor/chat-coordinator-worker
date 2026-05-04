import { expect, test } from '@jest/globals'
import { getToolCallResults } from '../src/parts/GetToolCallResults/GetToolCallResults.ts'

test('getToolCallResults should return an empty array for an empty tool call list', async () => {
  const result = await getToolCallResults([])

  expect(result).toEqual([])
})

test('getToolCallResults should not mutate the provided tool calls', async () => {
  const toolCalls = [{ args: { query: 'status' }, id: 'tool_1' }]

  const result = await getToolCallResults(toolCalls)

  expect(result).toEqual([
    {
      type: 'success',
      value: {
        query: 'status',
      },
    },
  ])
  expect(toolCalls).toEqual([{ args: { query: 'status' }, id: 'tool_1' }])
})

test('getToolCallResults returns one result per tool call', async () => {
  const result = await getToolCallResults([
    { args: { query: 'status' }, id: 'tool_1' },
    { args: { path: '/tmp/file.txt' }, id: 'tool_2' },
  ])

  expect(result).toEqual([
    {
      type: 'success',
      value: {
        query: 'status',
      },
    },
    {
      type: 'success',
      value: {
        path: '/tmp/file.txt',
      },
    },
  ])
})
