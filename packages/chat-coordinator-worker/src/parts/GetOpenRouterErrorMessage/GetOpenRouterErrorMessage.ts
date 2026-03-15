import type { GetOpenRouterAssistantTextErrorResult } from '../GetOpenRouterAssistantText/GetOpenRouterAssistantText.ts'
import { openRouterRequestFailedMessage } from '../chatViewStrings/chatViewStrings.ts'
import { getOpenRouterTooManyRequestsMessage } from '../GetOpenRouterTooManyRequestsMessage/GetOpenRouterTooManyRequestsMessage.ts'

export const getOpenRouterErrorMessage = (errorResult: GetOpenRouterAssistantTextErrorResult): string => {
  switch (errorResult.details) {
    case 'http-error':
    case 'request-failed':
      return openRouterRequestFailedMessage
    case 'too-many-requests':
      return getOpenRouterTooManyRequestsMessage(errorResult)
  }
}
