import type { AgentMode } from '../AgentMode/AgentMode.ts'
import { getPlanModePromptAddendum } from '../GetPlanModePromptAddendum/GetPlanModePromptAddendum.ts'

const workspaceUriPlaceholder = '{{workspaceUri}}'

const getCurrentDate = (): string => {
  return new Date().toISOString().slice(0, 10)
}

export const getSystemPromptForAgentMode = (systemPrompt: string, workspaceUri: string, agentMode: AgentMode): string => {
  const resolvedSystemPrompt = systemPrompt.replaceAll(workspaceUriPlaceholder, workspaceUri || 'unknown')
  const modeInstructions = agentMode === 'plan' ? getPlanModePromptAddendum() : ''
  const currentDateInstructions = `Current date: ${getCurrentDate()}.

Do not assume your knowledge cutoff is the same as the current date.`
  return [resolvedSystemPrompt, modeInstructions, currentDateInstructions].filter(Boolean).join('\n\n')
}
