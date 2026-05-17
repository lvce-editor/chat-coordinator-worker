import { expect, jest, test } from '@jest/globals'
import { createMockRpc } from '@lvce-editor/rpc'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { appendChatEvent } from '../src/parts/AppendChatEvent/AppendChatEvent.ts'

test.skip('append chat event mirrors message events to debug and view storage', async () => {
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  const appendDebugEvent = jest.fn(async (_event: unknown) => undefined)
  const rpc = createMockRpc({
    commandMap: {
      'ChatStorage.appendDebugEvent': appendDebugEvent,
      'ChatStorage.appendEvent': appendEvent,
    },
  })
  ChatStorageWorker.set(rpc)
  const event = {
    id: 'message-1',
    message: {
      content: [
        {
          text: 'Hello from user',
          type: 'text',
        },
      ],
      role: 'user',
    },
    sessionId: 'session-1',
    timestamp: '2026-05-04T16:05:24.098Z',
    type: 'message',
  }

  await appendChatEvent(event)

  expect(rpc.invocations).toEqual([
    ['ChatStorage.appendDebugEvent', event],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: 'message-1',
          role: 'user',
          text: 'Hello from user',
        },
        sessionId: 'session-1',
        timestamp: '2026-05-04T16:05:24.098Z',
        type: 'chat-message-added',
      },
    ],
  ])
})

test('appendChatEvent stores assistant tool calls in chat-view storage', async () => {
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  const rpc = createMockRpc({
    commandMap: {
      'ChatStorage.appendEvent': appendEvent,
    },
  })
  ChatStorageWorker.set(rpc)
  await appendChatEvent({
    id: 'message-2',
    message: {
      content: [
        {
          text: 'Let me check.',
          type: 'text',
        },
        {
          arguments: '{"uri":"file:///workspace/notes.txt"}',
          call_id: 'call_1',
          name: 'read_file',
          type: 'function_call',
        },
      ],
      role: 'assistant',
    },
    sessionId: 'session-1',
    timestamp: '2026-05-04T16:05:24.098Z',
    type: 'message',
  })

  expect(rpc.invocations).toEqual([
    [
      'ChatStorage.appendEvent',
      {
        message: {
          content: [
            {
              text: 'Let me check.',
              type: 'text',
            },
            {
              arguments: '{"uri":"file:///workspace/notes.txt"}',
              call_id: 'call_1',
              name: 'read_file',
              type: 'function_call',
            },
          ],
          id: 'message-2',
          role: 'assistant',
          text: 'Let me check.',
          time: '2026-05-04T16:05:24.098Z',
          toolCalls: [
            {
              arguments: '{"uri":"file:///workspace/notes.txt"}',
              id: 'call_1',
              name: 'read_file',
            },
          ],
        },
        sessionId: 'session-1',
        timestamp: '2026-05-04T16:05:24.098Z',
        type: 'chat-message-added',
      },
    ],
  ])
})
