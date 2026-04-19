import { expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { appendChatEvent } from '../src/parts/AppendChatEvent/AppendChatEvent.ts'

test('append chat event forwards event to chat storage worker', async () => {
  const appendEventSpy = jest.spyOn(ChatStorageWorker, 'appendEvent').mockResolvedValue(undefined)
  const event = {
    type: 'chat-message-added',
    sessionId: 'session-1',
  }

  await appendChatEvent(event)

  expect(appendEventSpy).toHaveBeenCalledTimes(1)
  expect(appendEventSpy).toHaveBeenCalledWith(event)

  appendEventSpy.mockRestore()
})