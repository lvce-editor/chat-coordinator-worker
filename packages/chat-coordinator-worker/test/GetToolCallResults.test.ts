import { afterEach, expect, jest, test } from '@jest/globals'
import { ChatToolWorker } from '@lvce-editor/rpc-registry'
import { getToolCallResults } from '../src/parts/GetToolCallResults/GetToolCallResults.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

test('getToolCallResults should return an empty array for an empty tool call list', async () => {
  const result = await getToolCallResults([])

  expect(result).toEqual([])
})

test('getToolCallResults should not mutate the provided tool calls', async () => {
  using rpc = ChatToolWorker.registerMockRpc({
    'ChatTool.execute': async () => ({
      workspaceUri: 'file:///workspace',
    }),
  })

  const toolCalls = [{ args: {}, id: 'tool_1', name: 'getWorkspaceUri' }]

  const result = await getToolCallResults(toolCalls)

  expect(result).toEqual([
    {
      callId: 'tool_1',
      type: 'success',
      value: {
        workspaceUri: 'file:///workspace',
      },
    },
  ])
  expect(toolCalls).toEqual([{ args: {}, id: 'tool_1', name: 'getWorkspaceUri' }])
  expect(rpc.invocations).toEqual([['ChatTool.execute', 'getWorkspaceUri', {}, { assetDir: '', platform: 1 }]])
})

test('getToolCallResults returns one result per tool call', async () => {
  using rpc = ChatToolWorker.registerMockRpc({
    'ChatTool.execute': async (name: string, rawArguments: unknown) => {
      if (name === 'getWorkspaceUri') {
        return {
          workspaceUri: 'file:///workspace',
        }
      }
      if (name === 'write_file') {
        const args = rawArguments as { readonly path: string }
        return {
          ok: true,
          path: args.path,
        }
      }
      throw new Error(`Unexpected tool name: ${name}`)
    },
  })

  const result = await getToolCallResults([
    { args: {}, id: 'tool_1', name: 'getWorkspaceUri' },
    { args: { content: '', path: '/tmp/file.txt' }, id: 'tool_2', name: 'write_file' },
  ])

  expect(result).toEqual([
    {
      callId: 'tool_1',
      type: 'success',
      value: {
        workspaceUri: 'file:///workspace',
      },
    },
    {
      callId: 'tool_2',
      type: 'success',
      value: {
        ok: true,
        path: '/tmp/file.txt',
      },
    },
  ])
  expect(rpc.invocations).toEqual([
    ['ChatTool.execute', 'getWorkspaceUri', {}, { assetDir: '', platform: 1 }],
    ['ChatTool.execute', 'write_file', { content: '', path: '/tmp/file.txt' }, { assetDir: '', platform: 1 }],
  ])
})

test('getToolCallResults executes read_file calls and keeps each result matched to its call id', async () => {
  using rpc = ChatToolWorker.registerMockRpc({
    'ChatTool.execute': async (name: string, rawArguments: unknown) => {
      if (name !== 'read_file') {
        throw new Error(`Unexpected tool name: ${name}`)
      }
      const args = rawArguments as { readonly uri: string }
      if (args.uri === 'file:///workspace/one.txt') {
        return {
          content: 'first file',
        }
      }
      if (args.uri === 'file:///workspace/two.txt') {
        return {
          content: 'second file',
        }
      }
      throw new Error(`Unexpected uri: ${args.uri}`)
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
      },
    },
    {
      callId: 'call_2',
      type: 'success',
      value: {
        content: 'second file',
      },
    },
  ])
  expect(rpc.invocations).toEqual([
    ['ChatTool.execute', 'read_file', { uri: 'file:///workspace/one.txt' }, { assetDir: '', platform: 1 }],
    ['ChatTool.execute', 'read_file', { uri: 'file:///workspace/two.txt' }, { assetDir: '', platform: 1 }],
  ])
})

test('getToolCallResults returns error results when chat-tool-worker reports a failure', async () => {
  using rpc = ChatToolWorker.registerMockRpc({
    'ChatTool.execute': async () => ({
      errorMessage: 'spawn /bin/missing ENOENT',
    }),
  })

  const result = await getToolCallResults([
    {
      args: {
        options: {
          command: 'ls -la',
          explanation: 'List files for inspection',
          goal: 'Inspect workspace contents',
          shell: '/bin/missing',
        },
      },
      id: 'call_1',
      name: 'run_in_terminal',
    },
  ])

  expect(result).toEqual([
    {
      callId: 'call_1',
      error: 'spawn /bin/missing ENOENT',
      type: 'error',
    },
  ])
  expect(rpc.invocations).toEqual([
    [
      'ChatTool.execute',
      'run_in_terminal',
      {
        options: {
          command: 'ls -la',
          explanation: 'List files for inspection',
          goal: 'Inspect workspace contents',
          shell: '/bin/missing',
        },
      },
      { assetDir: '', platform: 1 },
    ],
  ])
})
