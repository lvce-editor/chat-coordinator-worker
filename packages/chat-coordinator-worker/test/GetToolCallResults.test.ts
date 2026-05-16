import { afterEach, expect, jest, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { getToolCallResults } from '../src/parts/GetToolCallResults/GetToolCallResults.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

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

test('getToolCallResults executes read_file calls and keeps each result matched to its call id', async () => {
  const rpc = RendererWorker.registerMockRpc({
    'FileSystem.readFile': async (uri: string) => {
      if (uri === 'file:///workspace/one.txt') {
        return 'first file'
      }
      if (uri === 'file:///workspace/two.txt') {
        return 'second file'
      }
      throw new Error(`Unexpected uri: ${uri}`)
    },
  })

  const result = await getToolCallResults([
    {
      args: { uri: 'file:///workspace/one.txt' },
      id: 'call_1',
      name: 'read_file',
    },
    {
      args: { uri: 'file:///workspace/two.txt' },
      id: 'call_2',
      name: 'read_file',
    },
  ])

  expect(result).toEqual([
    {
      callId: 'call_1',
      type: 'success',
      value: {
        content: 'first file',
        uri: 'file:///workspace/one.txt',
      },
    },
    {
      callId: 'call_2',
      type: 'success',
      value: {
        content: 'second file',
        uri: 'file:///workspace/two.txt',
      },
    },
  ])
  expect(rpc.invocations).toEqual([
    ['FileSystem.readFile', 'file:///workspace/one.txt'],
    ['FileSystem.readFile', 'file:///workspace/two.txt'],
  ])
})
