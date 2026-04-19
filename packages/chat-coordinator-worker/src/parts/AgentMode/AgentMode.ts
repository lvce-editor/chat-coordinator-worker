export const agentModes = ['agent', 'plan'] as const

export type AgentMode = (typeof agentModes)[number]

export const defaultAgentMode: AgentMode = 'agent'

export const isAgentMode = (value: string): value is AgentMode => {
  return agentModes.includes(value as AgentMode)
}

export const getAgentModeLabel = (agentMode: AgentMode): string => {
  switch (agentMode) {
    case 'agent':
      return 'Agent'
    case 'plan':
      return 'Plan'
    default:
      return agentMode
  }
}
