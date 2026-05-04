import type { ChatSession } from '../ChatSession/ChatSession.ts'

export const getChatSessionStatus = (session: ChatSession): NonNullable<ChatSession['status']> => {
  if (session.status) {
    return session.status
  }
  const hasInProgressAssistantMessage = session.messages.some((message) => message.role === 'assistant' && message.inProgress)
  if (hasInProgressAssistantMessage) {
    return 'in-progress'
  }
  const hasAssistantMessage = session.messages.some((message) => message.role === 'assistant')
  if (hasAssistantMessage) {
    return 'finished'
  }
  return 'idle'
}
