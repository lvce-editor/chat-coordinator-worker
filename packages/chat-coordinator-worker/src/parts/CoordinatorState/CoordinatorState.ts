import type {
  ChatCoordinatorHandleSubmitOptions,
  ChatCoordinatorHandleSubmitResult,
  ChatCoordinatorEvent,
  ChatCoordinatorMessage,
  ChatCoordinatorSession,
  ChatCoordinatorSessionSummary,
  ChatCoordinatorSubmitOptions,
  ChatCoordinatorSubmitResult,
} from './CoordinatorTypes.ts'
import {
  deleteChatSession,
  getChatSession,
  listChatSessionsWithMessages,
  saveChatSession,
  useRpcChatSessionStorage,
} from '../ChatSessionStorage/ChatSessionStorage.ts'
import { startHandleSubmit } from '../HandleSubmit/HandleSubmit.ts'

const sessions: ChatCoordinatorSession[] = []
const subscriberQueues = new Map<string, ChatCoordinatorEvent[]>()
const subscriberWaiters = new Map<string, Array<() => void>>()
const activeRunBySessionId = new Map<string, string>()
const runById = new Map<string, { readonly assistantMessageId: string; readonly sessionId: string }>()
const cancelledRunIds = new Set<string>()
const runPromises = new Map<string, Promise<void>>()
let hydrated = false

const clone = <T>(value: T): T => {
  return structuredClone(value)
}

const getStoredSession = async (sessionId: string): Promise<ChatCoordinatorSession | undefined> => {
  const session = await getChatSession(sessionId)
  if (!session) {
    return undefined
  }
  return clone(session)
}

const ensureHydrated = async (): Promise<void> => {
  if (hydrated) {
    return
  }
  const storedSessions = await listChatSessionsWithMessages()
  sessions.length = 0
  for (const session of storedSessions) {
    sessions.push(clone(session))
  }
  hydrated = true
}

const upsertSession = (session: ChatCoordinatorSession): void => {
  const index = getSessionIndex(session.id)
  if (index === -1) {
    sessions.push(clone(session))
    return
  }
  sessions[index] = clone(session)
}

const persistSession = async (sessionId: string): Promise<void> => {
  const session = sessions.find((item) => item.id === sessionId)
  if (!session) {
    return
  }
  await saveChatSession(clone(session))
}

const getSessionIndex = (sessionId: string): number => {
  return sessions.findIndex((session) => session.id === sessionId)
}

const emitEvent = (event: ChatCoordinatorEvent): void => {
  for (const queue of subscriberQueues.values()) {
    queue.push(clone(event))
  }
  for (const [subscriberId, waiters] of subscriberWaiters) {
    const queue = subscriberQueues.get(subscriberId)
    if (!queue || queue.length === 0) {
      continue
    }
    const callbacks = [...waiters]
    waiters.length = 0
    for (const callback of callbacks) {
      callback()
    }
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

const updateMessage = async (
  sessionId: string,
  messageId: string,
  text: string,
  inProgress: boolean,
  toolCalls?: ChatCoordinatorMessage['toolCalls'],
): Promise<ChatCoordinatorMessage | undefined> => {
  const index = getSessionIndex(sessionId)
  if (index === -1) {
    return undefined
  }
  const session = sessions[index]
  const nextMessages = session.messages.map((message) => {
    if (message.id !== messageId) {
      return message
    }
    return {
      ...message,
      inProgress,
      text,
      ...(toolCalls === undefined
        ? {}
        : {
            toolCalls,
          }),
    }
  })
  const updatedMessage = nextMessages.find((message) => message.id === messageId)
  if (!updatedMessage) {
    return undefined
  }
  sessions[index] = {
    ...session,
    messages: nextMessages,
  }
  await persistSession(sessionId)
  return updatedMessage
}

const appendMessage = async (sessionId: string, message: ChatCoordinatorMessage): Promise<boolean> => {
  const index = getSessionIndex(sessionId)
  if (index === -1) {
    return false
  }
  const session = sessions[index]
  sessions[index] = {
    ...session,
    messages: [...session.messages, message],
  }
  await persistSession(sessionId)
  return true
}

const getChunks = (text: string): readonly string[] => {
  const tokens = text.split(' ')
  return tokens.map((token, index) => {
    if (index === tokens.length - 1) {
      return token
    }
    return `${token} `
  })
}

const finalizeRun = (runId: string, sessionId: string): void => {
  activeRunBySessionId.delete(sessionId)
  runById.delete(runId)
  cancelledRunIds.delete(runId)
  runPromises.delete(runId)
}

const processRun = async (runId: string, sessionId: string, assistantMessageId: string, prompt: string): Promise<void> => {
  const baseText = `Coordinator pipeline placeholder response for: ${prompt}`
  const chunks = getChunks(baseText)
  let currentText = ''

  for (const chunk of chunks) {
    if (cancelledRunIds.has(runId)) {
      const cancelledMessage = await updateMessage(sessionId, assistantMessageId, currentText, false)
      if (cancelledMessage) {
        emitEvent({
          message: clone(cancelledMessage),
          runId,
          sessionId,
          type: 'message-updated',
        })
      }
      emitEvent({
        runId,
        sessionId,
        type: 'run-cancelled',
      })
      finalizeRun(runId, sessionId)
      return
    }
    currentText += chunk
    const updatedMessage = await updateMessage(sessionId, assistantMessageId, currentText, true)
    if (updatedMessage) {
      emitEvent({
        message: clone(updatedMessage),
        runId,
        sessionId,
        type: 'message-updated',
      })
    }
    await Promise.resolve()
  }

  const doneMessage = await updateMessage(sessionId, assistantMessageId, currentText, false)
  if (doneMessage) {
    emitEvent({
      message: clone(doneMessage),
      runId,
      sessionId,
      type: 'message-updated',
    })
  }
  emitEvent({
    runId,
    sessionId,
    type: 'run-finished',
  })
  finalizeRun(runId, sessionId)
}

export const listSessions = async (): Promise<readonly ChatCoordinatorSessionSummary[]> => {
  await ensureHydrated()
  return sessions.map((session) => ({
    id: session.id,
    messageCount: session.messages.length,
    title: session.title,
  }))
}

export const getSession = async (sessionId: string): Promise<ChatCoordinatorSession | undefined> => {
  await ensureHydrated()
  const session = sessions.find((item) => item.id === sessionId)
  if (!session) {
    const storedSession = await getStoredSession(sessionId)
    if (!storedSession) {
      return undefined
    }
    upsertSession(storedSession)
    return storedSession
  }
  return clone(session)
}

export const createSession = async (title: string = ''): Promise<ChatCoordinatorSession> => {
  await ensureHydrated()
  const session: ChatCoordinatorSession = {
    id: crypto.randomUUID(),
    messages: [],
    title: title || `Chat ${sessions.length + 1}`,
  }
  sessions.push(session)
  await persistSession(session.id)
  emitEvent({
    session,
    type: 'session-created',
  })
  return clone(session)
}

export const deleteSession = async (sessionId: string): Promise<boolean> => {
  await ensureHydrated()
  const index = getSessionIndex(sessionId)
  if (index === -1) {
    return false
  }
  sessions.splice(index, 1)
  await deleteChatSession(sessionId)
  emitEvent({
    sessionId,
    type: 'session-deleted',
  })
  return true
}

export const submit = async (options: Readonly<ChatCoordinatorSubmitOptions>): Promise<ChatCoordinatorSubmitResult> => {
  await ensureHydrated()
  const text = options.text.trim()
  if (!text) {
    return {
      message: 'Prompt is empty.',
      type: 'error',
    }
  }

  let session = options.sessionId ? sessions.find((item) => item.id === options.sessionId) : undefined
  if (!session && options.sessionId) {
    const storedSession = await getStoredSession(options.sessionId)
    if (storedSession) {
      upsertSession(storedSession)
      session = storedSession
    }
  }
  if (!session) {
    session = await createSession()
  }

  if (activeRunBySessionId.has(session.id)) {
    return {
      message: 'Session already has an active run.',
      type: 'error',
    }
  }

  const userMessage = createMessage('user', text)
  const assistantMessage: ChatCoordinatorMessage = {
    ...createMessage('assistant', ''),
    inProgress: true,
  }
  await appendMessage(session.id, userMessage)
  await appendMessage(session.id, assistantMessage)
  const updatedSession = await getSession(session.id)
  if (updatedSession) {
    emitEvent({
      session: updatedSession,
      type: 'session-updated',
    })
  }
  emitEvent({
    message: clone(userMessage),
    sessionId: session.id,
    type: 'message-appended',
  })
  emitEvent({
    message: clone(assistantMessage),
    sessionId: session.id,
    type: 'message-appended',
  })

  const runId = crypto.randomUUID()
  activeRunBySessionId.set(session.id, runId)
  runById.set(runId, {
    assistantMessageId: assistantMessage.id,
    sessionId: session.id,
  })
  emitEvent({
    assistantMessageId: assistantMessage.id,
    runId,
    sessionId: session.id,
    type: 'run-started',
  })
  const runPromise = processRun(runId, session.id, assistantMessage.id, text)
  runPromises.set(runId, runPromise)

  return {
    assistantMessageId: assistantMessage.id,
    runId,
    sessionId: session.id,
    type: 'success',
    userMessageId: userMessage.id,
  }
}

export const handleSubmit = async (options: Readonly<ChatCoordinatorHandleSubmitOptions>): Promise<ChatCoordinatorHandleSubmitResult> => {
  useRpcChatSessionStorage()
  const result = await startHandleSubmit(options, {
    onMessageAppended: (sessionId, message) => {
      emitEvent({
        message: clone(message),
        sessionId,
        type: 'message-appended',
      })
    },
    onMessageUpdated: (runId, sessionId, message) => {
      emitEvent({
        message: clone(message),
        runId,
        sessionId,
        type: 'message-updated',
      })
    },
    onRunFinished: (runId, sessionId) => {
      emitEvent({
        runId,
        sessionId,
        type: 'run-finished',
      })
      runById.delete(runId)
      runPromises.delete(runId)
    },
    onRunStarted: (assistantMessageId, runId, sessionId) => {
      emitEvent({
        assistantMessageId,
        runId,
        sessionId,
        type: 'run-started',
      })
    },
    onSessionCreated: (session) => {
      emitEvent({
        session: clone(session),
        type: 'session-created',
      })
    },
  })
  if (result.type !== 'success') {
    return result
  }
  runById.set(result.runId, {
    assistantMessageId: result.assistantMessageId,
    sessionId: result.sessionId,
  })
  runPromises.set(result.runId, result.runPromise)
  return {
    assistantMessageId: result.assistantMessageId,
    runId: result.runId,
    sessionId: result.sessionId,
    type: 'success',
    userMessageId: result.userMessageId,
  }
}

export const cancelRun = (runId: string): boolean => {
  if (!runById.has(runId)) {
    return false
  }
  cancelledRunIds.add(runId)
  return true
}

export const subscribe = (subscriberId: string): void => {
  if (subscriberQueues.has(subscriberId)) {
    return
  }
  subscriberQueues.set(subscriberId, [])
  subscriberWaiters.set(subscriberId, [])
}

export const unsubscribe = (subscriberId: string): void => {
  subscriberQueues.delete(subscriberId)
  subscriberWaiters.delete(subscriberId)
}

export const consumeEvents = (subscriberId: string): readonly ChatCoordinatorEvent[] => {
  const queue = subscriberQueues.get(subscriberId)
  if (!queue) {
    return []
  }
  const events = [...queue]
  queue.length = 0
  return events
}

export const waitForEvents = async (subscriberId: string, timeout: number = 1000): Promise<readonly ChatCoordinatorEvent[]> => {
  const queue = subscriberQueues.get(subscriberId)
  if (!queue) {
    return []
  }
  if (queue.length > 0) {
    return consumeEvents(subscriberId)
  }

  await new Promise<void>((resolve) => {
    const waiters = subscriberWaiters.get(subscriberId)
    if (!waiters) {
      resolve()
      return
    }
    waiters.push(resolve)
    setTimeout(resolve, timeout)
  })
  return consumeEvents(subscriberId)
}

export const reset = (): void => {
  sessions.length = 0
  subscriberQueues.clear()
  activeRunBySessionId.clear()
  runById.clear()
  cancelledRunIds.clear()
  runPromises.clear()
  subscriberWaiters.clear()
  hydrated = false
}

export const awaitRun = async (runId: string): Promise<void> => {
  const promise = runPromises.get(runId)
  if (!promise) {
    return
  }
  await promise
}
