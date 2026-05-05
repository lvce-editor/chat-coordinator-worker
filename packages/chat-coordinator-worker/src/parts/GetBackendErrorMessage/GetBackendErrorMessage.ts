interface BackendHttpErrorResult {
  readonly details: 'http-error'
  readonly errorCode?: string
  readonly errorMessage?: string
  readonly statusCode?: number
}

interface BackendRequestFailedErrorResult {
  readonly details: 'request-failed'
  readonly errorMessage?: string
}

interface BackendInvalidResponseErrorResult {
  readonly details: 'invalid-response'
  readonly errorMessage?: string
}

export type GetBackendErrorMessageResult = BackendHttpErrorResult | BackendRequestFailedErrorResult | BackendInvalidResponseErrorResult

const backendCompletionFailedMessage = 'Backend completion request failed.'

const getBackendModelNotAllowedForFreePlanMessage = (statusCode: number | undefined): string => {
  if (typeof statusCode === 'number') {
    return `Backend completion request failed (status ${statusCode}). The selected model is not available on the Free plan. Choose a lower-cost LVCE model such as Claude Haiku or GPT-5.4 Mini, or upgrade your plan and try again.`
  }
  return 'Backend completion request failed. The selected model is not available on the Free plan. Choose a lower-cost LVCE model such as Claude Haiku or GPT-5.4 Mini, or upgrade your plan and try again.'
}

const getBackendHttpErrorDetails = (errorCode: string | undefined, errorMessage: string | undefined): string | undefined => {
  const trimmedErrorCode = errorCode?.trim()
  const trimmedErrorMessage = errorMessage?.trim()
  if (trimmedErrorCode && trimmedErrorMessage) {
    return `Error code: ${trimmedErrorCode}. ${trimmedErrorMessage}`
  }
  if (trimmedErrorCode) {
    return `Error code: ${trimmedErrorCode}.`
  }
  return trimmedErrorMessage
}

export const getBackendErrorMessage = (errorResult: GetBackendErrorMessageResult): string => {
  switch (errorResult.details) {
    case 'http-error': {
      if (errorResult.errorCode === 'E_LVCE_MODEL_NOT_ALLOWED_FOR_FREE_PLAN') {
        return getBackendModelNotAllowedForFreePlanMessage(errorResult.statusCode)
      }
      const details = getBackendHttpErrorDetails(errorResult.errorCode, errorResult.errorMessage)
      if (typeof errorResult.statusCode === 'number') {
        const prefix = `Backend completion request failed (status ${errorResult.statusCode}).`
        if (!details) {
          return prefix
        }
        return `${prefix} ${details}`
      }
      if (details) {
        return `Backend completion request failed. ${details}`
      }
      return backendCompletionFailedMessage
    }
    case 'invalid-response': {
      const errorMessage = errorResult.errorMessage?.trim()
      if (errorMessage) {
        return `Backend completion request failed. ${errorMessage}`
      }
      return 'Backend completion request failed. Unexpected backend response format.'
    }
    case 'request-failed': {
      const errorMessage = errorResult.errorMessage?.trim()
      if (errorMessage) {
        return `Backend completion request failed. ${errorMessage}`
      }
      return backendCompletionFailedMessage
    }
  }
}
