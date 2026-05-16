import { AuthWorker } from '@lvce-editor/rpc-registry'
import type { AiRequestOptions } from '../AiRequestOptions/AiRequestOptions.ts'

interface BackendAuthState {
  readonly authAccessToken?: string
}

const backendResponsesPath = '/v1/responses'

const getBackendUrl = (url: string): string => {
  if (url.endsWith(backendResponsesPath)) {
    return url.slice(0, -backendResponsesPath.length)
  }
  return url
}

export const resolveAiRequestHeaders = async (
  options: Pick<AiRequestOptions, 'headers' | 'providerId' | 'url'>,
): Promise<Readonly<Record<string, string>>> => {
  const { headers, providerId, url } = options
  if (providerId !== 'backend') {
    return headers
  }
  const backendUrl = getBackendUrl(url)
  const authState = (await AuthWorker.invoke('Auth.syncBackendAuth', backendUrl)) as BackendAuthState
  if (!authState.authAccessToken) {
    return headers
  }
  return {
    ...headers,
    Authorization: `Bearer ${authState.authAccessToken}`,
  }
}
