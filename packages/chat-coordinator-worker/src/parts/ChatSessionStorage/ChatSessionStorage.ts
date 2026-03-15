import type { ChatSession } from '../ChatSession/ChatSession.ts'
import type { ChatViewEvent } from '../ChatViewEvent/ChatViewEvent.ts'
import { IndexedDbChatSessionStorage } from '../IndexedDbChatSessionStorage/IndexedDbChatSessionStorage.ts'
import { InMemoryChatSessionStorage } from '../InMemoryChatSessionStorage/InMemoryChatSessionStorage.ts'

export interface ChatSessionStorage {
  appendEvent(event: ChatViewEvent): Promise<void>
  clear(): Promise<void>
  deleteSession(id: string): Promise<void>
  getEvents(sessionId?: string): Promise<readonly ChatViewEvent[]>
  getSession(id: string): Promise<ChatSession | undefined>
  listSessions(): Promise<readonly ChatSession[]>
  setSession(session: ChatSession): Promise<void>
}

const createDefaultStorage = (): Readonly<ChatSessionStorage> => {
  if (typeof indexedDB === 'undefined') {
    return new InMemoryChatSessionStorage()
  }
  return new IndexedDbChatSessionStorage()
}

let chatSessionStorage: Readonly<ChatSessionStorage> = createDefaultStorage()

export const setChatSessionStorage = (storage: Readonly<ChatSessionStorage>): void => {
  chatSessionStorage = storage
}

export const resetChatSessionStorage = (): void => {
  chatSessionStorage = new InMemoryChatSessionStorage()
}

export const listChatSessions = async (): Promise<readonly ChatSession[]> => {
  const sessions = await chatSessionStorage.listSessions()
  return sessions.map((session) => {
    const summary: ChatSession = {
      id: session.id,
      messages: [],
      title: session.title,
    }
    if (!session.projectId) {
      return summary
    }
    return {
      ...summary,
      projectId: session.projectId,
    }
  })
}

export const getChatSession = async (id: string): Promise<ChatSession | undefined> => {
  const session = await chatSessionStorage.getSession(id)
  if (!session) {
    return undefined
  }
  const resultBase: ChatSession = {
    id: session.id,
    messages: [...session.messages],
    title: session.title,
  }
  const result = session.projectId
    ? {
        ...resultBase,
        projectId: session.projectId,
      }
    : resultBase
  return result
}

export const saveChatSession = async (session: ChatSession): Promise<void> => {
  const value: ChatSession = {
    id: session.id,
    messages: [...session.messages],
    title: session.title,
  }
  await chatSessionStorage.setSession(
    session.projectId
      ? {
          ...value,
          projectId: session.projectId,
        }
      : value,
  )
}

export const deleteChatSession = async (id: string): Promise<void> => {
  await chatSessionStorage.deleteSession(id)
}

export const clearChatSessions = async (): Promise<void> => {
  await chatSessionStorage.clear()
}

export const appendChatViewEvent = async (event: ChatViewEvent): Promise<void> => {
  await chatSessionStorage.appendEvent(event)
}

export const getChatViewEvents = async (sessionId?: string): Promise<readonly ChatViewEvent[]> => {
  return chatSessionStorage.getEvents(sessionId)
}
