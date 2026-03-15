import type { GetOpenApiAssistantTextErrorResult } from '../GetOpenApiAssistantTextErrorResult/GetOpenApiAssistantTextErrorResult.ts'
import { openApiRequestFailedMessage, openApiRequestFailedOfflineMessage } from '../chatViewStrings/chatViewStrings.ts'

const isOffline = (): boolean => {
  if (!globalThis.navigator) {
    return false
  }
  return globalThis.navigator.onLine === false
}

export const getOpenApiErrorMessage = (errorResult: GetOpenApiAssistantTextErrorResult): string => {
  switch (errorResult.details) {
    case 'http-error': {
      const errorMessage = errorResult.errorMessage?.trim()
      const hasErrorCode = typeof errorResult.errorCode === 'string' && errorResult.errorCode.length > 0
      const hasErrorType = typeof errorResult.errorType === 'string' && errorResult.errorType.length > 0

      // Provide a concise, user-friendly message when OpenAI reports an invalid API key.
      if (errorResult.errorCode === 'invalid_api_key') {
        const status = typeof errorResult.statusCode === 'number' ? errorResult.statusCode : 401
        return `OpenAI request failed (Status ${status}): Invalid API key. Please verify your OpenAI API key in Chat Settings.`
      }

      if (errorResult.statusCode === 429) {
        let prefix = 'OpenAI rate limit exceeded (429)'
        if (hasErrorCode) {
          prefix = `OpenAI rate limit exceeded (429: ${errorResult.errorCode})`
        }
        if (hasErrorType) {
          prefix += ` [${errorResult.errorType}]`
        }
        prefix += '.'
        if (!errorMessage) {
          return prefix
        }
        return `${prefix} ${errorMessage}`
      }

      if (typeof errorResult.statusCode === 'number') {
        let prefix = `OpenAI request failed (status ${errorResult.statusCode})`
        if (hasErrorCode) {
          prefix += `: ${errorResult.errorCode}`
        }
        if (hasErrorType) {
          prefix += ` [${errorResult.errorType}]`
        }
        prefix += '.'
        if (!errorMessage) {
          return prefix
        }
        return `${prefix} ${errorMessage}`
      }

      if (errorMessage) {
        return `OpenAI request failed. ${errorMessage}`
      }
      return openApiRequestFailedMessage
    }
    case 'request-failed':
      if (isOffline()) {
        return openApiRequestFailedOfflineMessage
      }
      return openApiRequestFailedMessage
  }
}
