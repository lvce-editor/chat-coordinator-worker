import type { ChatSession } from '../ChatSession/ChatSession.ts'
import type { ChatSessionStorage } from '../ChatSessionStorage/ChatSessionStorage.ts'
import type { ChatViewEvent } from '../ChatViewEvent/ChatViewEvent.ts'
import { requestToPromise } from './RequestToPromise/RequestToPromise.ts'
import { transactionToPromise } from './TransactionToPromise/TransactionToPromise.ts'

interface State {
  readonly databaseName: string
  databasePromise: Promise<IDBDatabase> | undefined
  readonly databaseVersion: number
  readonly eventStoreName: string
  readonly storeName: string
}

interface IndexedDbChatSessionStorageOptions {
  readonly databaseName?: string
  readonly databaseVersion?: number
  readonly eventStoreName?: string
  readonly storeName?: string
}

interface SessionSummary {
  readonly id: string
  readonly messages?: readonly ChatSession['messages'][number][]
  readonly title: string
}

type StoredChatViewEvent = ChatViewEvent & {
  readonly eventId?: number
}

const toChatViewEvent = (event: StoredChatViewEvent): ChatViewEvent => {
  const { eventId, ...chatViewEvent } = event
  void eventId
  return chatViewEvent as ChatViewEvent
}

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

const replaySession = (id: string, summary: SessionSummary | undefined, events: readonly ChatViewEvent[]): ChatSession | undefined => {
  let deleted = false
  let title = summary?.title || ''
  let messages: readonly ChatSession['messages'][number][] = summary?.messages ? [...summary.messages] : []
  for (const event of events) {
    if (event.sessionId !== id) {
      continue
    }
    if (event.type === 'chat-session-created') {
      const { title: eventTitle } = event
      deleted = false
      title = eventTitle
      continue
    }
    if (event.type === 'chat-session-deleted') {
      deleted = true
      continue
    }
    if (event.type === 'chat-session-title-updated') {
      const { title: eventTitle } = event
      title = eventTitle
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
  if (deleted || !title) {
    return undefined
  }
  return {
    id,
    messages,
    title,
  }
}

export class IndexedDbChatSessionStorage implements ChatSessionStorage {
  private state: State

  constructor(options: IndexedDbChatSessionStorageOptions = {}) {
    this.state = {
      databaseName: options.databaseName || 'lvce-chat-view-sessions',
      databasePromise: undefined,
      databaseVersion: options.databaseVersion || 2,
      eventStoreName: options.eventStoreName || 'chat-view-events',
      storeName: options.storeName || 'chat-sessions',
    }
  }

  private openDatabase = async (): Promise<IDBDatabase> => {
    if (this.state.databasePromise) {
      return this.state.databasePromise
    }
    const request = indexedDB.open(this.state.databaseName, this.state.databaseVersion)
    request.addEventListener('upgradeneeded', () => {
      const database = request.result
      if (!database.objectStoreNames.contains(this.state.storeName)) {
        database.createObjectStore(this.state.storeName, {
          keyPath: 'id',
        })
      }
      if (database.objectStoreNames.contains(this.state.eventStoreName)) {
        const { transaction } = request
        if (!transaction) {
          return
        }
        const eventStore = transaction.objectStore(this.state.eventStoreName)
        if (!eventStore.indexNames.contains('sessionId')) {
          eventStore.createIndex('sessionId', 'sessionId', { unique: false })
        }
      } else {
        const eventStore = database.createObjectStore(this.state.eventStoreName, {
          autoIncrement: true,
          keyPath: 'eventId',
        })
        eventStore.createIndex('sessionId', 'sessionId', { unique: false })
      }
    })
    const databasePromise = requestToPromise(() => request)
    this.state.databasePromise = databasePromise
    return databasePromise
  }

  private listSummaries = async (): Promise<readonly SessionSummary[]> => {
    const database = await this.openDatabase()
    const transaction = database.transaction(this.state.storeName, 'readonly')
    const store = transaction.objectStore(this.state.storeName)
    const summaries = await requestToPromise(() => store.getAll())
    return summaries as readonly SessionSummary[]
  }

  private getSummary = async (id: string): Promise<SessionSummary | undefined> => {
    const database = await this.openDatabase()
    const transaction = database.transaction(this.state.storeName, 'readonly')
    const store = transaction.objectStore(this.state.storeName)
    const summary = await requestToPromise(() => store.get(id))
    return summary as SessionSummary | undefined
  }

  private getEventsBySessionId = async (sessionId: string): Promise<readonly ChatViewEvent[]> => {
    const database = await this.openDatabase()
    const transaction = database.transaction(this.state.eventStoreName, 'readonly')
    const store = transaction.objectStore(this.state.eventStoreName)
    const index = store.index('sessionId')
    const events = await requestToPromise(() => index.getAll(IDBKeyRange.only(sessionId)))
    return (events as readonly StoredChatViewEvent[]).map(toChatViewEvent)
  }

  private listEventsInternal = async (): Promise<readonly ChatViewEvent[]> => {
    const database = await this.openDatabase()
    const transaction = database.transaction(this.state.eventStoreName, 'readonly')
    const store = transaction.objectStore(this.state.eventStoreName)
    const events = await requestToPromise(() => store.getAll())
    return (events as readonly StoredChatViewEvent[]).map(toChatViewEvent)
  }

  private appendEvents = async (events: readonly ChatViewEvent[]): Promise<void> => {
    if (events.length === 0) {
      return
    }
    const database = await this.openDatabase()
    const transaction = database.transaction([this.state.storeName, this.state.eventStoreName], 'readwrite')
    const summaryStore = transaction.objectStore(this.state.storeName)
    const eventStore = transaction.objectStore(this.state.eventStoreName)
    for (const event of events) {
      eventStore.add(event)
      if (event.type === 'chat-session-created' || event.type === 'chat-session-title-updated') {
        summaryStore.put({
          id: event.sessionId,
          title: event.title,
        })
      }
      if (event.type === 'chat-session-deleted') {
        summaryStore.delete(event.sessionId)
      }
    }
    await transactionToPromise(() => transaction)
  }

  async appendEvent(event: ChatViewEvent): Promise<void> {
    await this.appendEvents([event])
  }

  async clear(): Promise<void> {
    const database = await this.openDatabase()
    const transaction = database.transaction([this.state.storeName, this.state.eventStoreName], 'readwrite')
    transaction.objectStore(this.state.storeName).clear()
    transaction.objectStore(this.state.eventStoreName).clear()
    await transactionToPromise(() => transaction)
  }

  async deleteSession(id: string): Promise<void> {
    await this.appendEvent({
      sessionId: id,
      timestamp: now(),
      type: 'chat-session-deleted',
    })
  }

  async getEvents(sessionId?: string): Promise<readonly ChatViewEvent[]> {
    if (sessionId) {
      return this.getEventsBySessionId(sessionId)
    }
    return this.listEventsInternal()
  }

  async getSession(id: string): Promise<ChatSession | undefined> {
    const [summary, events] = await Promise.all([this.getSummary(id), this.getEventsBySessionId(id)])
    return replaySession(id, summary, events)
  }

  async listSessions(): Promise<readonly ChatSession[]> {
    const summaries = await this.listSummaries()
    const sessions: ChatSession[] = []
    for (const summary of summaries) {
      const events = await this.getEventsBySessionId(summary.id)
      const session = replaySession(summary.id, summary, events)
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
    await this.appendEvents(events)
    if (events.length === 0) {
      const database = await this.openDatabase()
      const transaction = database.transaction(this.state.storeName, 'readwrite')
      const summaryStore = transaction.objectStore(this.state.storeName)
      summaryStore.put({
        id: session.id,
        title: session.title,
      })
      await transactionToPromise(() => transaction)
    }
  }
}
