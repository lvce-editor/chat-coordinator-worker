import type { ChatSession } from '../ChatState/ChatState.ts'
import { saveChatSession } from '../ChatSessionStorage/ChatSessionStorage.ts'
import { generateSessionId } from '../GenerateSessionId/GenerateSessionId.ts'

export const createSession = async (): Promise<ChatSession> => {
  const id = generateSessionId()
  const session: ChatSession = {
    id,
    messages: [],
    projectId: '',
    title: `Chat `,
  }
  await saveChatSession(session)
  return session
}
