import type { ChatMessage } from '../ChatMessage/ChatMessage.ts'
import type { ChatState } from '../ChatState/ChatState.ts'
import { appendMessageToSelectedSession } from '../AppendMessageToSelectedSession/AppendMessageToSelectedSession.ts'
import { saveChatSession } from '../ChatSessionStorage/ChatSessionStorage.ts'
import { createSession } from '../CreateSession/CreateSession.ts'
import { getCommandHelpText } from '../GetCommandHelpText/GetCommandHelpText.ts'
import { parseAndStoreMessageContent } from '../ParsedMessageContent/ParsedMessageContent.ts'
import { clearSlashCommands, registerSlashCommand } from '../SlashCommandRegistry/SlashCommandRegistry.ts'
import { toMarkdownTranscript } from '../ToMarkdownTranscript/ToMarkdownTranscript.ts'
import { withClearedComposer } from '../WithClearedComposer/WithClearedComposer.ts'

const appendAssistantMessage = async (state: ChatState, assistantText: string): Promise<ChatState> => {
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

export const registerSlashCommands = (): void => {
  clearSlashCommands()
  registerSlashCommand('new', async (state) => {
    const nextState = await createSession(state)
    return withClearedComposer({
      ...nextState,
      viewMode: 'detail',
    })
  })

  registerSlashCommand('clear', async (state) => {
    const selectedSession = state.sessions.find((session) => session.id === state.selectedSessionId)
    if (!selectedSession) {
      return withClearedComposer(state)
    }
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
  })

  registerSlashCommand('help', async (state) => {
    return appendAssistantMessage(state, getCommandHelpText())
  })

  registerSlashCommand('export', async (state) => {
    const selectedSession = state.sessions.find((session) => session.id === state.selectedSessionId)
    if (!selectedSession) {
      return withClearedComposer(state)
    }
    const assistantText = ['```md', toMarkdownTranscript(selectedSession), '```'].join('\n')
    return appendAssistantMessage(state, assistantText)
  })
}
