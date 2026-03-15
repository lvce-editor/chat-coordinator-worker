import type { ChatSession } from '../ChatState/ChatState.ts'

export const toMarkdownTranscript = (session: ChatSession): string => {
  const lines = [`# ${session.title}`, '']
  for (const message of session.messages) {
    const role = message.role === 'assistant' ? 'Assistant' : 'User'
    lines.push(`## ${role}`)
    lines.push(message.text || '(empty)')
    lines.push('')
  }
  return lines.join('\n').trim()
}
