import type {
  ChatCoordinatorEvent,
  ChatCoordinatorMessage,
  ChatCoordinatorSession,
  ChatCoordinatorSessionSummary,
  ChatCoordinatorSubmitOptions,
  ChatCoordinatorSubmitResult,
} from './CoordinatorTypes.ts'

const sessions: ChatCoordinatorSession[] = []
const subscriberQueues = new Map<string, ChatCoordinatorEvent[]>()

const clone = <T>(value: T): T => {
  return structuredClone(value)
}

const getSessionIndex = (sessionId: string): number => {
  return sessions.findIndex((session) => session.id === sessionId)
}

const emitEvent = (event: ChatCoordinatorEvent): void => {
  for (const queue of subscriberQueues.values()) {
    queue.push(clone(event))
  }
}

const createMessage = (role: 'assistant' | 'tool' | 'user', text: string): ChatCoordinatorMessage => {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

export const listSessions = (): readonly ChatCoordinatorSessionSummary[] => {
  return sessions.map((session) => ({
    id: session.id,
    messageCount: session.messages.length,
    title: session.title,
  }))
}

export const getSession = (sessionId: string): ChatCoordinatorSession | undefined => {
  const session = sessions.find((item) => item.id === sessionId)
  if (!session) {
    return undefined
  }
  return clone(session)
}

export const createSession = (title: string = `Chat ${sessions.length + 1}`): ChatCoordinatorSession => {
  const session: ChatCoordinatorSession = {
    id: crypto.randomUUID(),
    messages: [],
    title,
  }
  sessions.push(session)
  emitEvent({
    session,
    type: 'session-created',
  })
  return clone(session)
}

export const deleteSession = (sessionId: string): boolean => {
  const index = getSessionIndex(sessionId)
  if (index === -1) {
    return false
  }
  sessions.splice(index, 1)
  emitEvent({
    sessionId,
    type: 'session-deleted',
  })
  return true
}

export const submit = (options: Readonly<ChatCoordinatorSubmitOptions>): ChatCoordinatorSubmitResult => {
  const text = options.text.trim()
  if (!text) {
    return {
      message: 'Prompt is empty.',
      type: 'error',
    }
  }

  let session = options.sessionId ? sessions.find((item) => item.id === options.sessionId) : undefined
  if (!session) {
    session = createSession()
  }

  const userMessage = createMessage('user', text)
  const assistantMessage = createMessage('assistant', 'Coordinator pipeline placeholder response.')
  const nextSession: ChatCoordinatorSession = {
    ...session,
    messages: [...session.messages, userMessage, assistantMessage],
  }

  const index = getSessionIndex(session.id)
  sessions[index] = nextSession

  emitEvent({
    session: nextSession,
    type: 'session-updated',
  })

  return {
    assistantMessageId: assistantMessage.id,
    sessionId: session.id,
    type: 'success',
    userMessageId: userMessage.id,
  }
}

export const subscribe = (subscriberId: string): void => {
  if (subscriberQueues.has(subscriberId)) {
    return
  }
  subscriberQueues.set(subscriberId, [])
}

export const unsubscribe = (subscriberId: string): void => {
  subscriberQueues.delete(subscriberId)
}

export const consumeEvents = (subscriberId: string): readonly ChatCoordinatorEvent[] => {
  const queue = subscriberQueues.get(subscriberId)
  if (!queue) {
    return []
  }
  const events = queue.slice()
  queue.length = 0
  return events
}

export const reset = (): void => {
  sessions.length = 0
  subscriberQueues.clear()
}
