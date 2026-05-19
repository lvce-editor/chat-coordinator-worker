import type { GetOpenApiAssistantTextErrorResult } from '../GetOpenApiAssistantTextErrorResult/GetOpenApiAssistantTextErrorResult.ts'

type MockStreamState = {
  readonly queue: string[]
  readonly waiters: Array<(chunk: string | undefined) => void>
  finished: boolean
  errorResult: GetOpenApiAssistantTextErrorResult | undefined
}

const defaultRequestId = 'default'

let streamStates = new Map<string, MockStreamState>()
let preparedRequestIds: string[] = []

const createState = (): MockStreamState => {
  return {
    errorResult: undefined,
    finished: false,
    queue: [],
    waiters: [],
  }
}

const getOrCreateState = (requestId: string): MockStreamState => {
  const existing = streamStates.get(requestId)
  if (existing) {
    return existing
  }
  const state = createState()
  streamStates.set(requestId, state)
  return state
}

const enqueuePreparedRequest = (requestId: string): void => {
  if (preparedRequestIds.includes(requestId)) {
    return
  }
  preparedRequestIds.push(requestId)
}

const getNextPreparedRequestId = (): string => {
  return preparedRequestIds.shift() || defaultRequestId
}

export const reset = (requestId: string = defaultRequestId): void => {
  if (requestId === defaultRequestId) {
    streamStates = new Map()
    preparedRequestIds = []
    streamStates.set(defaultRequestId, createState())
    return
  }
  streamStates.set(requestId, createState())
  enqueuePreparedRequest(requestId)
}

export const setHttpErrorResponse = (statusCode: number, body: unknown, requestId: string = defaultRequestId): void => {
  const rawError = body && typeof body === 'object' ? Reflect.get(body, 'error') : undefined
  const errorCode = rawError && typeof rawError === 'object' ? Reflect.get(rawError, 'code') : undefined
  const errorMessage = rawError && typeof rawError === 'object' ? Reflect.get(rawError, 'message') : undefined
  const errorType = rawError && typeof rawError === 'object' ? Reflect.get(rawError, 'type') : undefined
  const state = getOrCreateState(requestId)
  state.errorResult = {
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

export const setRequestFailedResponse = (isOffline: boolean = false, requestId: string = defaultRequestId): void => {
  const state = getOrCreateState(requestId)
  state.errorResult = {
    details: 'request-failed',
    ...(isOffline
      ? {
          isOffline: true,
        }
      : {}),
    type: 'error',
  }
}

export const takeErrorResponse = (requestId: string = defaultRequestId): GetOpenApiAssistantTextErrorResult | undefined => {
  const state = getOrCreateState(requestId)
  const error = state.errorResult
  state.errorResult = undefined
  return error
}

export const pushChunk = (chunk: string, requestId: string = defaultRequestId): void => {
  const state = getOrCreateState(requestId)
  if (state.waiters.length > 0) {
    const resolve = state.waiters.shift()
    resolve?.(chunk)
    return
  }
  state.queue.push(chunk)
}

export const finish = (requestId: string = defaultRequestId): void => {
  const state = getOrCreateState(requestId)
  state.finished = true
  if (state.waiters.length === 0) {
    return
  }
  const activeWaiters = [...state.waiters]
  state.waiters.length = 0
  for (const resolve of activeWaiters) {
    resolve(undefined)
  }
}

export const readNextChunk = async (requestId: string = defaultRequestId): Promise<string | undefined> => {
  const state = getOrCreateState(requestId)
  if (state.queue.length > 0) {
    return state.queue.shift()
  }
  if (state.finished) {
    return undefined
  }
  const { promise, resolve } = Promise.withResolvers<string | undefined>()
  state.waiters.push(resolve)
  return promise
}

export const consumeResponseText = async (): Promise<string | undefined> => {
  const requestId = getNextPreparedRequestId()
  const state = getOrCreateState(requestId)
  if (state.queue.length === 0 && !state.finished) {
    return undefined
  }
  const chunks: string[] = []
  while (true) {
    const chunk = await readNextChunk(requestId)
    if (chunk === undefined) {
      break
    }
    chunks.push(chunk)
  }
  streamStates.delete(requestId)
  return chunks.join('')
}
