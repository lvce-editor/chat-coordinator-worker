import { expect, test } from '@jest/globals'
import { getToolCallResults } from '../src/parts/GetToolCallResults/GetToolCallResults.ts'

test('getToolCallResults should return an empty array for an empty tool call list', async () => {
  const result = await getToolCallResults([])

  expect(result).toEqual([])
})

test('getToolCallResults should not mutate the provided tool calls', async () => {
  const toolCalls = [{ args: { query: 'status' }, id: 'tool_1', name: 'read_status' }]

  const result = await getToolCallResults(toolCalls)

  expect(result).toEqual([
    {
      callId: 'tool_1',
      type: 'success',
      value: {
        query: 'status',
      },
    },
  ])
  expect(toolCalls).toEqual([{ args: { query: 'status' }, id: 'tool_1', name: 'read_status' }])
})

test('getToolCallResults returns one result per tool call', async () => {
  const result = await getToolCallResults([
    { args: { query: 'status' }, id: 'tool_1', name: 'read_status' },
    { args: { path: '/tmp/file.txt' }, id: 'tool_2', name: 'write_file' },
  ])

  expect(result).toEqual([
    {
      callId: 'tool_1',
      type: 'success',
      value: {
        query: 'status',
      },
    },
    {
      callId: 'tool_2',
      type: 'success',
      value: {
        path: '/tmp/file.txt',
      },
    },
  ])
})
