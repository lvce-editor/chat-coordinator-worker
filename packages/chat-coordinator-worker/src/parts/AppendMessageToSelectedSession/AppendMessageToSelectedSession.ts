import type { ChatMessage, ChatSession } from '../ChatState/ChatState.ts'

export const appendMessageToSelectedSession = (
  sessions: readonly ChatSession[],
  selectedSessionId: string,
  message: ChatMessage,
): readonly ChatSession[] => {
  return sessions.map((session) => {
    if (session.id !== selectedSessionId) {
      return session
    }
    return {
      ...session,
      messages: [...session.messages, message],
    }
  })
}
