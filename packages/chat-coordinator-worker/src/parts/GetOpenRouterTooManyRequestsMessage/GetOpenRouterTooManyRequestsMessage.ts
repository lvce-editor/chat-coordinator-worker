import type { GetOpenRouterAssistantTextErrorResult } from '../GetOpenRouterAssistantText/GetOpenRouterAssistantText.ts'
import { openRouterTooManyRequestsMessage } from '../chatViewStrings/chatViewStrings.ts'

export const getOpenRouterTooManyRequestsMessage = (errorResult: GetOpenRouterAssistantTextErrorResult): string => {
  const details: string[] = []
  if (errorResult.rawMessage) {
    details.push(errorResult.rawMessage)
  }
  const { limitInfo } = errorResult
  if (limitInfo) {
    if (limitInfo.retryAfter) {
      details.push(`Retry after: ${limitInfo.retryAfter}.`)
    }
    if (limitInfo.limitReset) {
      details.push(`Limit resets: ${limitInfo.limitReset}.`)
    }
    if (limitInfo.limitRemaining === null) {
      details.push('Credits remaining: unlimited.')
    } else if (typeof limitInfo.limitRemaining === 'number') {
      details.push(`Credits remaining: ${limitInfo.limitRemaining}.`)
    }
    if (typeof limitInfo.usageDaily === 'number') {
      details.push(`Credits used today (UTC): ${limitInfo.usageDaily}.`)
    }
    if (typeof limitInfo.usage === 'number') {
      details.push(`Credits used (all time): ${limitInfo.usage}.`)
    }
  }

  if (details.length === 0) {
    return openRouterTooManyRequestsMessage
  }

  return `${openRouterTooManyRequestsMessage} ${details.join(' ')}`
}
