interface MockBackendCompletionHttpErrorResponse {
  readonly body: unknown
  readonly statusCode: number
  readonly type: 'http-error'
}

interface MockBackendCompletionSuccessResponse {
  readonly body: unknown
  readonly type: 'success'
}

const state: {
  errorResponse: MockBackendCompletionHttpErrorResponse | undefined
  successResponse: MockBackendCompletionSuccessResponse | undefined
} = {
  errorResponse: undefined,
  successResponse: undefined,
}

export const setHttpErrorResponse = (statusCode: number, body: unknown): void => {
  state.errorResponse = {
    body,
    statusCode,
    type: 'http-error',
  }
}

export const setResponse = (body: unknown): void => {
  state.successResponse = {
    body,
    type: 'success',
  }
}

export const takeErrorResponse = (): MockBackendCompletionHttpErrorResponse | undefined => {
  const response = state.errorResponse
  state.errorResponse = undefined
  return response
}

export const takeResponse = (): MockBackendCompletionSuccessResponse | undefined => {
  const response = state.successResponse
  state.successResponse = undefined
  return response
}
