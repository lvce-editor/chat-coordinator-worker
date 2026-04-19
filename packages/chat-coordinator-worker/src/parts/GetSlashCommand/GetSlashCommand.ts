import { hasSlashCommand } from '../SlashCommandRegistry/SlashCommandRegistry.ts'

const slashCommandRegex = /^\/([a-z][a-z0-9-]*)(?:\s+.*)?$/i

export const getSlashCommand = (value: string): string | undefined => {
  const trimmed = value.trim()
  const match = trimmed.match(slashCommandRegex)
  if (!match) {
    return undefined
  }
  const command = match[1].toLowerCase()
  if (!hasSlashCommand(command)) {
    return undefined
  }
  return command
}
