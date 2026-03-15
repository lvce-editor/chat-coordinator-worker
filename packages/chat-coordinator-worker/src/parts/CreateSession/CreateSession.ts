import type { ChatSession, ChatState } from '../ChatState/ChatState.ts'
import { saveChatSession } from '../ChatSessionStorage/ChatSessionStorage.ts'
import { generateSessionId } from '../GenerateSessionId/GenerateSessionId.ts'

export const createSession = async (state: ChatState, projectIdOverride = ''): Promise<ChatState> => {
  const id = generateSessionId()
  const fallbackProjectId = state.projects.find((project) => project.name === '_blank')?.id || state.projects[0]?.id || 'project-1'
  const projectId = projectIdOverride || state.selectedProjectId || fallbackProjectId
  const session: ChatSession = {
    id,
    messages: [],
    projectId,
    title: `Chat ${state.sessions.length + 1}`,
  }
  await saveChatSession(session)
  return {
    ...state,
    projectExpandedIds: state.projectExpandedIds.includes(projectId) ? state.projectExpandedIds : [...state.projectExpandedIds, projectId],
    renamingSessionId: '',
    selectedProjectId: projectId,
    selectedSessionId: id,
    sessions: [...state.sessions, session],
  }
}
