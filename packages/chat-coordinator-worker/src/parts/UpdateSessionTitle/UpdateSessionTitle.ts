import type { ChatSession } from '../ChatSession/ChatSession.ts'
export const updateSessionTitle = (sessions: readonly ChatSession[], selectedSessionId: string, title: string): readonly ChatSession[] => {
  return sessions.map((session) => {
    if (session.id !== selectedSessionId) {
      return session
    }
    return {
      ...session,
      title,
    }
  })
}
