export const getOpenApiModelId = (selectedModelId: string): string => {
  const openApiPrefix = 'openapi/'
  const openAiPrefix = 'openai/'
  const normalizedModelId = selectedModelId.toLowerCase()
  if (normalizedModelId.startsWith(openApiPrefix)) {
    return selectedModelId.slice(openApiPrefix.length)
  }
  if (normalizedModelId.startsWith(openAiPrefix)) {
    return selectedModelId.slice(openAiPrefix.length)
  }
  return selectedModelId
}
