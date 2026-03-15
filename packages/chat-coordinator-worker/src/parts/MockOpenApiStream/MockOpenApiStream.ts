import type { GetOpenApiAssistantTextErrorResult } from '../GetOpenApiAssistantTextErrorResult/GetOpenApiAssistantTextErrorResult.ts'

let queue: string[] = []
let waiters: Array<(chunk: string | undefined) => void> = []
let finished = false
let errorResult: GetOpenApiAssistantTextErrorResult | undefined

export const reset = (): void => {
  queue = []
  waiters = []
  finished = false
  errorResult = undefined
}

export const setHttpErrorResponse = (statusCode: number, body: unknown): void => {
  const rawError = body && typeof body === 'object' ? Reflect.get(body, 'error') : undefined
  const errorCode = rawError && typeof rawError === 'object' ? Reflect.get(rawError, 'code') : undefined
  const errorMessage = rawError && typeof rawError === 'object' ? Reflect.get(rawError, 'message') : undefined
  const errorType = rawError && typeof rawError === 'object' ? Reflect.get(rawError, 'type') : undefined
  errorResult = {
    details: 'http-error',
    ...(typeof errorCode === 'string'
      ? {
          errorCode,
        }
      : {}),
    ...(typeof errorMessage === 'string'
      ? {
          errorMessage,
        }
      : {}),
    ...(typeof errorType === 'string'
      ? {
          errorType,
        }
      : {}),
    statusCode,
    type: 'error',
  }
}

export const takeErrorResponse = (): GetOpenApiAssistantTextErrorResult | undefined => {
  const error = errorResult
  errorResult = undefined
  return error
}

export const pushChunk = (chunk: string): void => {
  if (waiters.length > 0) {
    const resolve = waiters.shift()
    resolve?.(chunk)
    return
  }
  queue.push(chunk)
}

export const finish = (): void => {
  finished = true
  if (waiters.length === 0) {
    return
  }
  const activeWaiters = waiters
  waiters = []
  for (const resolve of activeWaiters) {
    resolve(undefined)
  }
}

export const readNextChunk = async (): Promise<string | undefined> => {
  if (queue.length > 0) {
    return queue.shift()
  }
  if (finished) {
    return undefined
  }
  const { promise, resolve } = Promise.withResolvers<string | undefined>()
  waiters.push(resolve)
  return promise
}
