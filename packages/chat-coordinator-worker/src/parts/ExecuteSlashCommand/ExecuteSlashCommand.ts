import type { ChatMessage, ChatState } from '../ChatState/ChatState.ts'
import { appendMessageToSelectedSession } from '../AppendMessageToSelectedSession/AppendMessageToSelectedSession.ts'
import { saveChatSession } from '../ChatSessionStorage/ChatSessionStorage.ts'
import { createSession } from '../CreateSession/CreateSession.ts'
import { getCommandHelpText } from '../GetCommandHelpText/GetCommandHelpText.ts'
import { parseAndStoreMessageContent } from '../ParsedMessageContent/ParsedMessageContent.ts'
import { toMarkdownTranscript } from '../ToMarkdownTranscript/ToMarkdownTranscript.ts'
import { withClearedComposer } from '../WithClearedComposer/WithClearedComposer.ts'

export const executeSlashCommand = async (state: ChatState, command: 'clear' | 'export' | 'help' | 'new'): Promise<ChatState> => {
  if (command === 'new') {
    const nextState = await createSession(state)
    return withClearedComposer({
      ...nextState,
      viewMode: 'detail',
    })
  }

  const selectedSession = state.sessions.find((session) => session.id === state.selectedSessionId)
  if (!selectedSession) {
    return withClearedComposer(state)
  }

  if (command === 'clear') {
    const updatedSessions = state.sessions.map((session) => {
      if (session.id !== state.selectedSessionId) {
        return session
      }
      return {
        ...session,
        messages: [],
      }
    })
    const updatedSelectedSession = updatedSessions.find((session) => session.id === state.selectedSessionId)
    if (updatedSelectedSession) {
      await saveChatSession(updatedSelectedSession)
    }
    return withClearedComposer({
      ...state,
      sessions: updatedSessions,
    })
  }

  const assistantText = command === 'help' ? getCommandHelpText() : ['```md', toMarkdownTranscript(selectedSession), '```'].join('\n')
  const assistantMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    text: assistantText,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
  const parsedMessages = await parseAndStoreMessageContent(state.parsedMessages, assistantMessage)
  const updatedSessions = appendMessageToSelectedSession(state.sessions, state.selectedSessionId, assistantMessage)
  const updatedSelectedSession = updatedSessions.find((session) => session.id === state.selectedSessionId)
  if (updatedSelectedSession) {
    await saveChatSession(updatedSelectedSession)
  }
  return withClearedComposer({
    ...state,
    parsedMessages,
    sessions: updatedSessions,
  })
}
