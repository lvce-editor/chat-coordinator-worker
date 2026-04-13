import { expect, test } from '@jest/globals'
import { ChatMessageParsingWorker, ChatToolWorker } from '@lvce-editor/rpc-registry'
import * as CoordinatorCommands from '../src/parts/CoordinatorCommands/CoordinatorCommands.ts'

test('parseMessageContent delegates to chat-message-parsing-worker', async () => {
  const nodes = [{ type: 'text', value: 'hello' }]
  using mockRpc = ChatMessageParsingWorker.registerMockRpc({
    'ChatMessageParsing.parseMessageContent': async () => nodes,
  })

  const result = await CoordinatorCommands.parseMessageContent('hello')

  expect(mockRpc.invocations).toEqual([['ChatMessageParsing.parseMessageContent', 'hello']])
  expect(result).toEqual(nodes)
})

test('parseMessageContents delegates to chat-message-parsing-worker', async () => {
  const nodes = [[{ type: 'text', value: 'hello' }], [{ type: 'text', value: 'world' }]]
  using mockRpc = ChatMessageParsingWorker.registerMockRpc({
    'ChatMessageParsing.parseMessageContents': async () => nodes,
  })

  const result = await CoordinatorCommands.parseMessageContents(['hello', 'world'])

  expect(mockRpc.invocations).toEqual([['ChatMessageParsing.parseMessageContents', ['hello', 'world']]])
  expect(result).toEqual(nodes)
})

test('executeToolByName delegates to chat-tool-worker', async () => {
  using mockRpc = ChatToolWorker.registerMockRpc({
    'ChatTool.execute': async () => ({ ok: true }),
  })

  const result = await CoordinatorCommands.executeToolByName('read_file', '{"path":"src/main.ts"}', {
    assetDir: '/test-asset-dir',
    platform: 0,
  })

  expect(mockRpc.invocations).toEqual([['ChatTool.execute', 'read_file', '{"path":"src/main.ts"}', { assetDir: '/test-asset-dir', platform: 0 }]])
  expect(result).toEqual({ ok: true })
})

test('getTools delegates to chat-tool-worker', async () => {
  const tools = [
    {
      function: {
        additionalProperties: false,
        description: 'Read a file',
        name: 'read_file',
        parameters: {
          properties: {},
          type: 'object',
        },
      },
      type: 'function',
    },
  ]
  using mockRpc = ChatToolWorker.registerMockRpc({
    'ChatTool.getTools': async () => tools,
  })

  const result = await CoordinatorCommands.getTools()

  expect(mockRpc.invocations).toEqual([['ChatTool.getTools']])
  expect(result).toEqual(tools)
})
