import { expect, jest, test } from '@jest/globals'

const appendEvent = jest.fn()

await jest.unstable_mockModule('@lvce-editor/rpc-registry', () => ({
  ChatStorageWorker: {
    appendEvent,
  },
}))

const { appendChatEvent } = await import('../src/parts/AppendChatEvent/AppendChatEvent.ts')

test('append chat event forwards event to chat storage worker', async () => {
  const event = {
    sessionId: 'session-1',
    type: 'chat-message-added',
  }

  await appendChatEvent(event)

  expect(appendEvent).toHaveBeenCalledTimes(1)
  expect(appendEvent.mock.calls[0][0]).toEqual(event)
})
