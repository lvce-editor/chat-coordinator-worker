export const getOpenRouterKeyEndpoint = (openRouterApiBaseUrl: string): string => {
  const trimmedBaseUrl = openRouterApiBaseUrl.replace(/\/+$/, '')
  return `${trimmedBaseUrl}/auth/key`
}
