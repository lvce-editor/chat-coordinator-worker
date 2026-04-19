import { expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { appendChatEvent } from '../src/parts/AppendChatEvent/AppendChatEvent.ts'

test('append chat event forwards event to chat storage worker', async () => {
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  ChatStorageWorker.set({
    appendEvent,
  } as any)
  const event = {
    sessionId: 'session-1',
    type: 'chat-message-added',
  }

  await appendChatEvent(event)

  expect(appendEvent).toHaveBeenCalledTimes(1)
  expect(appendEvent.mock.calls[0][0]).toEqual(event)
})
