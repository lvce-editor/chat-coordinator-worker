import { getBackendErrorMessage } from '../GetBackendErrorMessage/GetBackendErrorMessage.ts'

const getStatusCodeMessage = (statusCode: number): string => {
  switch (statusCode) {
    case 401:
      return 'The AI request was rejected. Check the API key and try again.'
    case 403:
      return 'The AI request was rejected. Check your permissions and try again.'
    case 408:
      return 'The AI request timed out. Please try again.'
    case 429:
      return 'The AI request was rate limited. Please try again.'
    default:
      if (statusCode >= 500) {
        return 'The AI provider is temporarily unavailable. Please try again.'
      }
      return 'The AI request failed. Please try again.'
  }
}

const getBackendErrorCodeFromBody = (body: unknown): string | undefined => {
  if (!body || typeof body !== 'object') {
    return undefined
  }
  const code = Reflect.get(body, 'code')
  return typeof code === 'string' ? code : undefined
}

const getBackendErrorMessageFromBody = (body: unknown): string | undefined => {
  if (!body || typeof body !== 'object') {
    return undefined
  }
  const error = Reflect.get(body, 'error')
  return typeof error === 'string' ? error : undefined
}

export const getVisibleAiErrorMessage = (_error: unknown, statusCode?: number, providerId = 'openai'): string => {
  if (providerId === 'backend') {
    const errorCode = getBackendErrorCodeFromBody(_error)
    const errorMessage =
      _error instanceof Error ? _error.message : typeof _error === 'object' && _error ? getBackendErrorMessageFromBody(_error) : undefined
    if (typeof statusCode === 'number') {
      return getBackendErrorMessage({
        details: 'http-error',
        ...(errorCode
          ? {
              errorCode,
            }
          : {}),
        ...(errorMessage
          ? {
              errorMessage,
            }
          : {}),
        statusCode,
      })
    }
    return getBackendErrorMessage({
      details: 'request-failed',
      ...(errorMessage
        ? {
            errorMessage,
          }
        : {}),
    })
  }
  if (typeof statusCode === 'number') {
    return getStatusCodeMessage(statusCode)
  }
  return 'The AI request failed. Please try again.'
}
