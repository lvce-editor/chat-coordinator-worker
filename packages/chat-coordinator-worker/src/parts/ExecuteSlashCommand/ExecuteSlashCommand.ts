import type { ChatMessage, ChatState } from '../ChatState/ChatState.ts'
import { appendMessageToSelectedSession } from '../AppendMessageToSelectedSession/AppendMessageToSelectedSession.ts'
import { saveChatSession } from '../ChatSessionStorage/ChatSessionStorage.ts'
import { createSession } from '../CreateSession/CreateSession.ts'
import { getCommandHelpText } from '../GetCommandHelpText/GetCommandHelpText.ts'
import { parseAndStoreMessageContent } from '../ParsedMessageContent/ParsedMessageContent.ts'
import { toMarkdownTranscript } from '../ToMarkdownTranscript/ToMarkdownTranscript.ts'
import { withClearedComposer } from '../WithClearedComposer/WithClearedComposer.ts'

type SlashCommand = 'clear' | 'export' | 'help' | 'new'

const getSelectedSession = (state: ChatState) => state.sessions.find((session) => session.id === state.selectedSessionId)

const saveSelectedSession = async (sessions: ChatState['sessions'], selectedSessionId: string): Promise<void> => {
  const updatedSelectedSession = sessions.find((session) => session.id === selectedSessionId)
  if (updatedSelectedSession) {
    await saveChatSession(updatedSelectedSession)
  }
}

const executeNewSlashCommand = async (state: ChatState): Promise<ChatState> => {
  const nextState = await createSession(state)
  return withClearedComposer({
    ...nextState,
    viewMode: 'detail',
  })
}

const executeClearSlashCommand = async (state: ChatState): Promise<ChatState> => {
  if (!getSelectedSession(state)) {
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
  await saveSelectedSession(updatedSessions, state.selectedSessionId)
  return withClearedComposer({
    ...state,
    sessions: updatedSessions,
  })
}

const appendAssistantMessage = async (state: ChatState, assistantText: string): Promise<ChatState> => {
  const selectedSession = state.sessions.find((session) => session.id === state.selectedSessionId)
  if (!selectedSession) {
    return withClearedComposer(state)
  }
  const assistantMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    text: assistantText,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
  const parsedMessages = await parseAndStoreMessageContent(state.parsedMessages, assistantMessage)
  const updatedSessions = appendMessageToSelectedSession(state.sessions, state.selectedSessionId, assistantMessage)
  await saveSelectedSession(updatedSessions, state.selectedSessionId)
  return withClearedComposer({
    ...state,
    parsedMessages,
    sessions: updatedSessions,
  })
}

const executeHelpSlashCommand = async (state: ChatState): Promise<ChatState> => {
  return appendAssistantMessage(state, getCommandHelpText())
}

const executeExportSlashCommand = async (state: ChatState): Promise<ChatState> => {
  const selectedSession = getSelectedSession(state)
  if (!selectedSession) {
    return withClearedComposer(state)
  }
  return appendAssistantMessage(state, ['```md', toMarkdownTranscript(selectedSession), '```'].join('\n'))
}

export const executeSlashCommand = async (state: ChatState, command: SlashCommand): Promise<ChatState> => {
  switch (command) {
    case 'new':
      return executeNewSlashCommand(state)
    case 'clear':
      return executeClearSlashCommand(state)
    case 'help':
      return executeHelpSlashCommand(state)
    case 'export':
      return executeExportSlashCommand(state)
  }
}
