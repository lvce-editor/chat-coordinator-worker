import * as CoordinatorState from '../CoordinatorState/CoordinatorState.ts'
import type {
  ChatCoordinatorSession,
  ChatCoordinatorSessionSummary,
  ChatCoordinatorSubmitOptions,
  ChatCoordinatorSubmitResult,
} from '../CoordinatorState/CoordinatorTypes.ts'

export const createSession = async (title?: string): Promise<ChatCoordinatorSession> => {
  return CoordinatorState.createSession(title)
}

export const listSessions = async (): Promise<readonly ChatCoordinatorSessionSummary[]> => {
  return CoordinatorState.listSessions()
}

export const getSession = async (sessionId: string): Promise<ChatCoordinatorSession | undefined> => {
  return CoordinatorState.getSession(sessionId)
}

export const deleteSession = async (sessionId: string): Promise<boolean> => {
  return CoordinatorState.deleteSession(sessionId)
}

export const submit = async (options: Readonly<ChatCoordinatorSubmitOptions>): Promise<ChatCoordinatorSubmitResult> => {
  return CoordinatorState.submit(options)
}

export const subscribe = async (subscriberId: string): Promise<void> => {
  CoordinatorState.subscribe(subscriberId)
}

export const unsubscribe = async (subscriberId: string): Promise<void> => {
  CoordinatorState.unsubscribe(subscriberId)
}

export const consumeEvents = async (subscriberId: string) => {
  return CoordinatorState.consumeEvents(subscriberId)
}
