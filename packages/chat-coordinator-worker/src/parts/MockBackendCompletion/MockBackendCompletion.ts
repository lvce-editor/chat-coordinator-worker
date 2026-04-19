interface MockBackendCompletionHttpErrorResponse {
  readonly body: unknown
  readonly statusCode: number
  readonly type: 'http-error'
}

interface MockBackendCompletionSuccessResponse {
  readonly body: unknown
  readonly type: 'success'
}

let errorResponse: MockBackendCompletionHttpErrorResponse | undefined
let successResponse: MockBackendCompletionSuccessResponse | undefined

export const setHttpErrorResponse = (statusCode: number, body: unknown): void => {
  errorResponse = {
    body,
    statusCode,
    type: 'http-error',
  }
}

export const setResponse = (body: unknown): void => {
  successResponse = {
    body,
    type: 'success',
  }
}

export const takeErrorResponse = (): MockBackendCompletionHttpErrorResponse | undefined => {
  const response = errorResponse
  errorResponse = undefined
  return response
}

export const takeResponse = (): MockBackendCompletionSuccessResponse | undefined => {
  const response = successResponse
  successResponse = undefined
  return response
}
