import type { GetOpenRouterAssistantTextErrorResult } from '../GetOpenRouterAssistantText/GetOpenRouterAssistantText.ts'

export const normalizeLimitInfo = (value: unknown): GetOpenRouterAssistantTextErrorResult['limitInfo'] | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const limitRemaining = Reflect.get(value, 'limitRemaining')
  const limitReset = Reflect.get(value, 'limitReset')
  const retryAfter = Reflect.get(value, 'retryAfter')
  const usage = Reflect.get(value, 'usage')
  const usageDaily = Reflect.get(value, 'usageDaily')
  const normalized: GetOpenRouterAssistantTextErrorResult['limitInfo'] = {
    ...(typeof limitRemaining === 'number' || limitRemaining === null
      ? {
          limitRemaining,
        }
      : {}),
    ...(typeof limitReset === 'string' || limitReset === null
      ? {
          limitReset,
        }
      : {}),
    ...(typeof retryAfter === 'string' || retryAfter === null
      ? {
          retryAfter,
        }
      : {}),
    ...(typeof usage === 'number'
      ? {
          usage,
        }
      : {}),
    ...(typeof usageDaily === 'number'
      ? {
          usageDaily,
        }
      : {}),
  }
  const hasDetails =
    typeof limitRemaining === 'number' ||
    limitRemaining === null ||
    typeof limitReset === 'string' ||
    limitReset === null ||
    typeof retryAfter === 'string' ||
    retryAfter === null ||
    typeof usage === 'number' ||
    typeof usageDaily === 'number'
  return hasDetails ? normalized : undefined
}
