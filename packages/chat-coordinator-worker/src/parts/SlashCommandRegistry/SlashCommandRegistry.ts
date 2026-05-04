import type { ChatState } from '../ChatState/ChatState.ts'

export type SlashCommandHandler = (state: ChatState) => Promise<ChatState>

const slashCommandRegistry: Record<string, SlashCommandHandler> = Object.create(null)

export const registerSlashCommand = (command: string, handler: SlashCommandHandler): void => {
  slashCommandRegistry[command] = handler
}

export const clearSlashCommands = (): void => {
  for (const command of Object.keys(slashCommandRegistry)) {
    delete slashCommandRegistry[command]
  }
}

export const hasSlashCommand = (command: string): boolean => {
  return command in slashCommandRegistry
}

export const getSlashCommandHandler = (command: string): SlashCommandHandler | undefined => {
  return slashCommandRegistry[command]
}
