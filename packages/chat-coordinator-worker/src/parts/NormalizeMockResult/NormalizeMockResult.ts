import type {
  GetOpenRouterAssistantTextErrorResult,
  GetOpenRouterAssistantTextSuccessResult,
} from '../GetOpenRouterAssistantText/GetOpenRouterAssistantText.ts'
import { normalizeLimitInfo } from '../NormalizeLimitInfo/NormalizeLimitInfo.ts'

export const normalizeMockResult = (value: unknown): GetOpenRouterAssistantTextSuccessResult | GetOpenRouterAssistantTextErrorResult => {
  if (typeof value === 'string') {
    return {
      text: value,
      type: 'success',
    }
  }
  if (!value || typeof value !== 'object') {
    return {
      details: 'request-failed',
      type: 'error',
    }
  }
  const type = Reflect.get(value, 'type')
  if (type === 'success') {
    const text = Reflect.get(value, 'text')
    if (typeof text === 'string') {
      return {
        text,
        type: 'success',
      }
    }
    return {
      details: 'request-failed',
      type: 'error',
    }
  }
  if (type === 'error') {
    const details = Reflect.get(value, 'details')
    if (details === 'request-failed' || details === 'too-many-requests' || details === 'http-error') {
      const rawMessage = Reflect.get(value, 'rawMessage')
      const statusCode = Reflect.get(value, 'statusCode')
      const limitInfo = normalizeLimitInfo(Reflect.get(value, 'limitInfo'))
      return {
        details,
        ...(limitInfo
          ? {
              limitInfo,
            }
          : {}),
        ...(typeof rawMessage === 'string'
          ? {
              rawMessage,
            }
          : {}),
        ...(typeof statusCode === 'number'
          ? {
              statusCode,
            }
          : {}),
        type: 'error',
      }
    }
  }
  const text = Reflect.get(value, 'text')
  if (typeof text === 'string') {
    return {
      text,
      type: 'success',
    }
  }
  return {
    details: 'request-failed',
    type: 'error',
  }
}
