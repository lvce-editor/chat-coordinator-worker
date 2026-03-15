import { beforeEach, expect, test } from '@jest/globals'
import {
  appendChatViewEvent,
  deleteChatSession,
  getChatSession,
  getChatViewEvents,
  resetChatSessionStorage,
  saveChatSession,
} from '../src/parts/ChatSessionStorage/ChatSessionStorage.ts'

beforeEach(() => {
  resetChatSessionStorage()
})

test('saveChatSession should append session creation and message events', async () => {
  await saveChatSession({
    id: 'session-1',
    messages: [{ id: 'message-1', role: 'user', text: 'hello', time: '10:00' }],
    title: 'Chat 1',
  })

  const events = await getChatViewEvents('session-1')

  expect(events).toHaveLength(2)
  expect(events[0]).toMatchObject({
    sessionId: 'session-1',
    title: 'Chat 1',
    type: 'chat-session-created',
  })
  expect(events[1]).toMatchObject({
    sessionId: 'session-1',
    type: 'chat-message-added',
  })
})

test('saveChatSession should append message update events for changed message text', async () => {
  await saveChatSession({
    id: 'session-1',
    messages: [{ id: 'message-1', inProgress: true, role: 'assistant', text: 'hel', time: '10:00' }],
    title: 'Chat 1',
  })

  await saveChatSession({
    id: 'session-1',
    messages: [{ id: 'message-1', inProgress: false, role: 'assistant', text: 'hello', time: '10:00' }],
    title: 'Chat 1',
  })

  const events = await getChatViewEvents('session-1')

  expect(events.at(-1)).toMatchObject({
    inProgress: false,
    messageId: 'message-1',
    sessionId: 'session-1',
    text: 'hello',
    type: 'chat-message-updated',
  })

  const session = await getChatSession('session-1')
  expect(session?.messages).toEqual([{ id: 'message-1', inProgress: false, role: 'assistant', text: 'hello', time: '10:00' }])
})

test('deleteChatSession should append delete event and hide session from reads', async () => {
  await saveChatSession({
    id: 'session-1',
    messages: [],
    title: 'Chat 1',
  })

  await deleteChatSession('session-1')

  const session = await getChatSession('session-1')
  const events = await getChatViewEvents('session-1')

  expect(session).toBeUndefined()
  expect(events.at(-1)).toMatchObject({
    sessionId: 'session-1',
    type: 'chat-session-deleted',
  })
})

test('appendChatViewEvent stores attachment events including blob payload', async () => {
  const blob = new Blob(['bytes'], { type: 'image/png' })

  await appendChatViewEvent({
    attachmentId: 'attachment-1',
    blob,
    mimeType: 'image/png',
    name: 'photo.png',
    sessionId: 'session-1',
    size: blob.size,
    timestamp: '2026-03-11T00:00:00.000Z',
    type: 'chat-attachment-added',
  })

  const events = await getChatViewEvents('session-1')

  expect(events).toHaveLength(1)
  expect(events[0]).toMatchObject({
    attachmentId: 'attachment-1',
    mimeType: 'image/png',
    name: 'photo.png',
    sessionId: 'session-1',
    type: 'chat-attachment-added',
  })
  if (events[0].type !== 'chat-attachment-added') {
    throw new TypeError('Expected chat-attachment-added event')
  }
  expect(events[0].blob).toBeInstanceOf(Blob)
  expect(events[0].blob.size).toBe(blob.size)
})
