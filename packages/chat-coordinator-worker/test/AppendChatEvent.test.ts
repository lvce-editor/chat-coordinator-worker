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
