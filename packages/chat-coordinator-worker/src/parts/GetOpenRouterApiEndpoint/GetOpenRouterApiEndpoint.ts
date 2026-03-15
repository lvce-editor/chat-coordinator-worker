export const getOpenRouterApiEndpoint = (openRouterApiBaseUrl: string): string => {
  const trimmedBaseUrl = openRouterApiBaseUrl.replace(/\/+$/, '')
  return `${trimmedBaseUrl}/chat/completions`
}
