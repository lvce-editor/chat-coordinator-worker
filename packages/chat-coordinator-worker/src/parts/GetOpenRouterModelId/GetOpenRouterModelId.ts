// cspell:ignore openrouter
export const getOpenRouterModelId = (selectedModelId: string): string => {
  const openRouterPrefix = 'openrouter/'
  if (selectedModelId.toLowerCase().startsWith(openRouterPrefix)) {
    return selectedModelId.slice(openRouterPrefix.length)
  }
  return selectedModelId
}
