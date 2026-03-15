import type { ChatModel } from '../ChatState/ChatState.ts'

export const isOpenApiModel = (selectedModelId: string, models: readonly ChatModel[]): boolean => {
  const selectedModel = models.find((model) => model.id === selectedModelId)
  const normalizedProvider = selectedModel?.provider?.toLowerCase()
  if (normalizedProvider === 'openapi' || normalizedProvider === 'openai' || normalizedProvider === 'open-ai') {
    return true
  }
  const normalizedModelId = selectedModelId.toLowerCase()
  return normalizedModelId.startsWith('openapi/') || normalizedModelId.startsWith('openai/')
}
