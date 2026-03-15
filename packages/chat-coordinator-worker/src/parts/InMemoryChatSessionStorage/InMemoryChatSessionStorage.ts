import type { ChatSession } from '../ChatSession/ChatSession.ts'
import type { ChatSessionStorage } from '../ChatSessionStorage/ChatSessionStorage.ts'
import type { ChatViewEvent } from '../ChatViewEvent/ChatViewEvent.ts'

const now = (): string => {
  return new Date().toISOString()
}

const isSameMessage = (a: Readonly<ChatSession['messages'][number]>, b: Readonly<ChatSession['messages'][number]>): boolean => {
  return (
    a.id === b.id &&
    a.inProgress === b.inProgress &&
    a.role === b.role &&
    a.text === b.text &&
    a.time === b.time &&
    JSON.stringify(a.toolCalls || []) === JSON.stringify(b.toolCalls || [])
  )
}

const canAppendMessages = (
  previousMessages: readonly ChatSession['messages'][number][],
  nextMessages: readonly ChatSession['messages'][number][],
): boolean => {
  if (nextMessages.length < previousMessages.length) {
    return false
  }
  return previousMessages.every((message, index) => isSameMessage(message, nextMessages[index]))
}

const canUpdateMessages = (
  previousMessages: readonly ChatSession['messages'][number][],
  nextMessages: readonly ChatSession['messages'][number][],
): boolean => {
  if (previousMessages.length !== nextMessages.length) {
    return false
  }
  for (let i = 0; i < previousMessages.length; i += 1) {
    const previous = previousMessages[i]
    const next = nextMessages[i]
    if (previous.id !== next.id || previous.role !== next.role) {
      return false
    }
  }
  return true
}

const getMutationEvents = (previous: ChatSession | undefined, next: ChatSession): readonly ChatViewEvent[] => {
  const timestamp = now()
  const events: ChatViewEvent[] = []
  if (!previous) {
    events.push({
      sessionId: next.id,
      timestamp,
      title: next.title,
      type: 'chat-session-created',
    })
    for (const message of next.messages) {
      events.push({
        message,
        sessionId: next.id,
        timestamp,
        type: 'chat-message-added',
      })
    }
    return events
  }
  if (previous.title !== next.title) {
    events.push({
      sessionId: next.id,
      timestamp,
      title: next.title,
      type: 'chat-session-title-updated',
    })
  }
  if (canAppendMessages(previous.messages, next.messages)) {
    for (let i = previous.messages.length; i < next.messages.length; i += 1) {
      events.push({
        message: next.messages[i],
        sessionId: next.id,
        timestamp,
        type: 'chat-message-added',
      })
    }
    return events
  }
  if (canUpdateMessages(previous.messages, next.messages)) {
    for (let i = 0; i < previous.messages.length; i += 1) {
      const previousMessage = previous.messages[i]
      const nextMessage = next.messages[i]
      if (!isSameMessage(previousMessage, nextMessage)) {
        events.push({
          inProgress: nextMessage.inProgress,
          messageId: nextMessage.id,
          sessionId: next.id,
          text: nextMessage.text,
          time: nextMessage.time,
          timestamp,
          toolCalls: nextMessage.toolCalls,
          type: 'chat-message-updated',
        })
      }
    }
    return events
  }
  events.push({
    messages: [...next.messages],
    sessionId: next.id,
    timestamp,
    type: 'chat-session-messages-replaced',
  })
  return events
}

const replaySession = (id: string, title: string | undefined, events: readonly ChatViewEvent[]): ChatSession | undefined => {
  let deleted = false
  let currentTitle = title || ''
  let messages: readonly ChatSession['messages'][number][] = []
  for (const event of events) {
    if (event.sessionId !== id) {
      continue
    }
    if (event.type === 'chat-session-created') {
      deleted = false
      currentTitle = event.title
      continue
    }
    if (event.type === 'chat-session-deleted') {
      deleted = true
      continue
    }
    if (event.type === 'chat-session-title-updated') {
      currentTitle = event.title
      continue
    }
    if (event.type === 'chat-message-added') {
      messages = [...messages, event.message]
      continue
    }
    if (event.type === 'chat-message-updated') {
      messages = messages.map((message) => {
        if (message.id !== event.messageId) {
          return message
        }
        return {
          ...message,
          ...(event.inProgress === undefined
            ? {}
            : {
                inProgress: event.inProgress,
              }),
          text: event.text,
          time: event.time,
          ...(event.toolCalls === undefined
            ? {}
            : {
                toolCalls: event.toolCalls,
              }),
        }
      })
      continue
    }
    if (event.type === 'chat-session-messages-replaced') {
      messages = [...event.messages]
    }
  }
  if (deleted || !currentTitle) {
    return undefined
  }
  return {
    id,
    messages,
    title: currentTitle,
  }
}

export class InMemoryChatSessionStorage implements ChatSessionStorage {
  private readonly events: ChatViewEvent[] = []
  private readonly summaries = new Map<string, string>()

  async appendEvent(event: ChatViewEvent): Promise<void> {
    this.events.push(event)
    if (event.type === 'chat-session-created' || event.type === 'chat-session-title-updated') {
      this.summaries.set(event.sessionId, event.title)
      return
    }
    if (event.type === 'chat-session-deleted') {
      this.summaries.delete(event.sessionId)
    }
  }

  async clear(): Promise<void> {
    this.events.length = 0
    this.summaries.clear()
  }

  async deleteSession(id: string): Promise<void> {
    await this.appendEvent({
      sessionId: id,
      timestamp: now(),
      type: 'chat-session-deleted',
    })
  }

  async getEvents(sessionId?: string): Promise<readonly ChatViewEvent[]> {
    if (!sessionId) {
      return [...this.events]
    }
    return this.events.filter((event) => event.sessionId === sessionId)
  }

  async getSession(id: string): Promise<ChatSession | undefined> {
    return replaySession(id, this.summaries.get(id), this.events)
  }

  async listSessions(): Promise<readonly ChatSession[]> {
    const ids = new Set<string>()
    for (const id of this.summaries.keys()) {
      ids.add(id)
    }
    for (const event of this.events) {
      ids.add(event.sessionId)
    }
    const sessions: ChatSession[] = []
    for (const id of ids) {
      const session = replaySession(id, this.summaries.get(id), this.events)
      if (!session) {
        continue
      }
      sessions.push(session)
    }
    return sessions
  }

  async setSession(session: ChatSession): Promise<void> {
    const previous = await this.getSession(session.id)
    const events = getMutationEvents(previous, session)
    for (const event of events) {
      await this.appendEvent(event)
    }
    this.summaries.set(session.id, session.title)
  }
}
