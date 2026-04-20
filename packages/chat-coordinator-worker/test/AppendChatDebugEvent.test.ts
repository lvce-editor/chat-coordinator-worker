import { expect, jest, test } from '@jest/globals'
import { createMockRpc } from '@lvce-editor/rpc'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { appendChatDebugEvent } from '../src/parts/AppendChatDebugEvent/AppendChatDebugEvent.ts'

test('append chat debug event forwards event to chat storage worker', async () => {
  const appendDebugEvent = jest.fn(async (_event: unknown) => undefined)
  const rpc = createMockRpc({
    commandMap: {
      'ChatStorage.appendDebugEvent': appendDebugEvent,
    },
  })
  ChatStorageWorker.set(rpc)
  const event = {
    requestId: 'request-1',
    sessionId: 'session-1',
    type: 'ai-request',
  }

  await appendChatDebugEvent(event)

  expect(rpc.invocations).toEqual([['ChatStorage.appendDebugEvent', event]])
})
