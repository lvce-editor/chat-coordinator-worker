import { expect, jest, test } from '@jest/globals'
import { createMockRpc } from '@lvce-editor/rpc'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { appendChatEvent } from '../src/parts/AppendChatEvent/AppendChatEvent.ts'

test('append chat event forwards event to chat storage worker', async () => {
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  const rpc = createMockRpc({
    commandMap: {
      'ChatStorage.appendEvent': appendEvent,
    },
  })
  ChatStorageWorker.set(rpc)
  const event = {
    sessionId: 'session-1',
    type: 'chat-message-added',
  }

  await appendChatEvent(event)

  expect(rpc.invocations).toEqual([['ChatStorage.appendEvent', event]])
})
