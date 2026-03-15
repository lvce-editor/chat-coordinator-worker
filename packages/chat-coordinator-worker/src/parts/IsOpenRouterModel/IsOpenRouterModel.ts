// cspell:ignore openrouter
import type { ChatModel } from '../ChatState/ChatState.ts'

export const isOpenRouterModel = (selectedModelId: string, models: readonly ChatModel[]): boolean => {
  const selectedModel = models.find((model) => model.id === selectedModelId)
  const normalizedProvider = selectedModel?.provider?.toLowerCase()
  if (normalizedProvider === 'openrouter' || normalizedProvider === 'open-router') {
    return true
  }
  return selectedModelId.toLowerCase().startsWith('openrouter/')
}
