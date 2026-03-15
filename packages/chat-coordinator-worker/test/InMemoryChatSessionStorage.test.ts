import { beforeEach, expect, test } from '@jest/globals'
import type { ChatSession } from '../src/parts/ChatSession/ChatSession.ts'
import { InMemoryChatSessionStorage } from '../src/parts/InMemoryChatSessionStorage/InMemoryChatSessionStorage.ts'

const message = (overrides: Partial<ChatSession['messages'][number]> = {}): ChatSession['messages'][number] => {
  return {
    id: 'message-1',
    role: 'assistant',
    text: 'hello',
    time: '10:00',
    ...overrides,
  }
}

const session = (overrides: Partial<ChatSession> = {}): ChatSession => {
  return {
    id: 'session-1',
    messages: [],
    title: 'Session 1',
    ...overrides,
  }
}

let storage: InMemoryChatSessionStorage

beforeEach(() => {
  storage = new InMemoryChatSessionStorage()
})

test('setSession creates session and emits one add event per message', async () => {
  await storage.setSession(
    session({
      messages: [message({ id: 'message-1', role: 'user' }), message({ id: 'message-2', text: 'answer' })],
    }),
  )

  const events = await storage.getEvents('session-1')

  expect(events).toHaveLength(3)
  expect(events[0]).toMatchObject({ sessionId: 'session-1', title: 'Session 1', type: 'chat-session-created' })
  expect(events[1]).toMatchObject({ sessionId: 'session-1', type: 'chat-message-added' })
  expect(events[2]).toMatchObject({ sessionId: 'session-1', type: 'chat-message-added' })
})

test('setSession appends new messages when previous messages are unchanged prefix', async () => {
  await storage.setSession(session({ messages: [message({ id: 'message-1' })] }))
  await storage.setSession(
    session({
      messages: [message({ id: 'message-1' }), message({ id: 'message-2', text: 'next', time: '10:01' })],
    }),
  )

  const events = await storage.getEvents('session-1')

  expect(events.at(-1)).toMatchObject({
    message: { id: 'message-2', role: 'assistant', text: 'next', time: '10:01' },
    sessionId: 'session-1',
    type: 'chat-message-added',
  })
})

test('setSession emits title updated event when title changes', async () => {
  await storage.setSession(session())
  await storage.setSession(session({ title: 'Renamed' }))

  const events = await storage.getEvents('session-1')

  expect(events.at(-1)).toMatchObject({
    sessionId: 'session-1',
    title: 'Renamed',
    type: 'chat-session-title-updated',
  })
})

test('setSession emits message updated when only text, inProgress or toolCalls change', async () => {
  await storage.setSession(
    session({
      messages: [message({ inProgress: true, text: 'hel', toolCalls: [{ arguments: '{}', name: 'read_file' }] })],
    }),
  )
  await storage.setSession(
    session({
      messages: [message({ inProgress: false, text: 'hello', toolCalls: [{ arguments: '{"path":"a"}', name: 'read_file' }] })],
    }),
  )

  const events = await storage.getEvents('session-1')
  const saved = await storage.getSession('session-1')

  expect(events.at(-1)).toMatchObject({
    inProgress: false,
    messageId: 'message-1',
    sessionId: 'session-1',
    text: 'hello',
    time: '10:00',
    toolCalls: [{ arguments: '{"path":"a"}', name: 'read_file' }],
    type: 'chat-message-updated',
  })
  expect(saved?.messages).toEqual([
    {
      id: 'message-1',
      inProgress: false,
      role: 'assistant',
      text: 'hello',
      time: '10:00',
      toolCalls: [{ arguments: '{"path":"a"}', name: 'read_file' }],
    },
  ])
})

test('setSession replaces messages when message id changes', async () => {
  await storage.setSession(session({ messages: [message({ id: 'message-1', text: 'first' })] }))
  await storage.setSession(session({ messages: [message({ id: 'message-2', text: 'changed id' })] }))

  const events = await storage.getEvents('session-1')

  expect(events.at(-1)).toMatchObject({
    messages: [{ id: 'message-2', role: 'assistant', text: 'changed id', time: '10:00' }],
    sessionId: 'session-1',
    type: 'chat-session-messages-replaced',
  })
})

test('setSession replaces messages when message role changes', async () => {
  await storage.setSession(session({ messages: [message({ id: 'message-1', role: 'assistant' })] }))
  await storage.setSession(session({ messages: [message({ id: 'message-1', role: 'user' })] }))

  const events = await storage.getEvents('session-1')

  expect(events.at(-1)).toMatchObject({
    messages: [{ id: 'message-1', role: 'user', text: 'hello', time: '10:00' }],
    sessionId: 'session-1',
    type: 'chat-session-messages-replaced',
  })
})

test('setSession replaces messages when message count shrinks', async () => {
  await storage.setSession(session({ messages: [message({ id: 'message-1' }), message({ id: 'message-2' })] }))
  await storage.setSession(session({ messages: [message({ id: 'message-1' })] }))

  const events = await storage.getEvents('session-1')
  const saved = await storage.getSession('session-1')

  expect(events.at(-1)).toMatchObject({
    messages: [{ id: 'message-1', role: 'assistant', text: 'hello', time: '10:00' }],
    sessionId: 'session-1',
    type: 'chat-session-messages-replaced',
  })
  expect(saved?.messages).toHaveLength(1)
})

test('getEvents filters by session id and returns all events without filter', async () => {
  await storage.setSession(session({ id: 'session-1', title: 'One' }))
  await storage.setSession(session({ id: 'session-2', title: 'Two' }))

  const eventsForOne = await storage.getEvents('session-1')
  const allEvents = await storage.getEvents()

  expect(eventsForOne).toHaveLength(1)
  expect(eventsForOne[0]).toMatchObject({ sessionId: 'session-1', type: 'chat-session-created' })
  expect(allEvents).toHaveLength(2)
})

test('deleteSession appends delete event and hides session from getSession and listSessions', async () => {
  await storage.setSession(session({ id: 'session-1', title: 'One' }))
  await storage.deleteSession('session-1')

  const stored = await storage.getSession('session-1')
  const sessions = await storage.listSessions()
  const events = await storage.getEvents('session-1')

  expect(stored).toBeUndefined()
  expect(sessions).toEqual([])
  expect(events.at(-1)).toMatchObject({ sessionId: 'session-1', type: 'chat-session-deleted' })
})

test('appendEvent can build and update session state through replay', async () => {
  await storage.appendEvent({ sessionId: 'session-1', timestamp: '2026-03-01T00:00:00.000Z', title: 'One', type: 'chat-session-created' })
  await storage.appendEvent({
    message: { id: 'message-1', role: 'assistant', text: 'hello', time: '10:00' },
    sessionId: 'session-1',
    timestamp: '2026-03-01T00:00:00.001Z',
    type: 'chat-message-added',
  })
  await storage.appendEvent({
    inProgress: false,
    messageId: 'message-1',
    sessionId: 'session-1',
    text: 'hello there',
    time: '10:01',
    timestamp: '2026-03-01T00:00:00.002Z',
    type: 'chat-message-updated',
  })
  await storage.appendEvent({ sessionId: 'session-1', timestamp: '2026-03-01T00:00:00.003Z', title: 'Renamed', type: 'chat-session-title-updated' })

  const stored = await storage.getSession('session-1')

  expect(stored).toEqual({
    id: 'session-1',
    messages: [{ id: 'message-1', inProgress: false, role: 'assistant', text: 'hello there', time: '10:01' }],
    title: 'Renamed',
  })
})

test('created event after delete restores session visibility', async () => {
  await storage.appendEvent({ sessionId: 'session-1', timestamp: '2026-03-01T00:00:00.000Z', title: 'One', type: 'chat-session-created' })
  await storage.appendEvent({ sessionId: 'session-1', timestamp: '2026-03-01T00:00:00.001Z', type: 'chat-session-deleted' })
  await storage.appendEvent({ sessionId: 'session-1', timestamp: '2026-03-01T00:00:00.002Z', title: 'Two', type: 'chat-session-created' })

  const stored = await storage.getSession('session-1')

  expect(stored).toEqual({
    id: 'session-1',
    messages: [],
    title: 'Two',
  })
})

test('clear removes all events and summaries', async () => {
  await storage.setSession(session({ id: 'session-1', title: 'One' }))
  await storage.setSession(session({ id: 'session-2', title: 'Two' }))
  await storage.clear()

  const sessions = await storage.listSessions()
  const events = await storage.getEvents()
  const stored = await storage.getSession('session-1')

  expect(sessions).toEqual([])
  expect(events).toEqual([])
  expect(stored).toBeUndefined()
})
