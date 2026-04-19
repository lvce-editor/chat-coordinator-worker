interface MockBackendAuthSuccess {
  readonly delay: number
  readonly response: unknown
  readonly type: 'success'
}

interface MockBackendAuthError {
  readonly delay: number
  readonly message: string
  readonly type: 'error'
}

type MockBackendAuthResponse = MockBackendAuthSuccess | MockBackendAuthError

let nextLoginResponse: MockBackendAuthResponse | undefined
let nextRefreshResponse: MockBackendAuthResponse | undefined

export const setNextLoginResponse = (response: MockBackendAuthResponse): void => {
  nextLoginResponse = response
}

export const setNextRefreshResponse = (response: MockBackendAuthResponse): void => {
  nextRefreshResponse = response
}

export const clear = (): void => {
  nextLoginResponse = undefined
  nextRefreshResponse = undefined
}

export const hasPendingMockLoginResponse = (): boolean => {
  return !!nextLoginResponse
}

export const hasPendingMockRefreshResponse = (): boolean => {
  return !!nextRefreshResponse
}

export const consumeNextLoginResponse = async (): Promise<unknown> => {
  if (!nextLoginResponse) {
    return undefined
  }
  const response = nextLoginResponse
  nextLoginResponse = undefined
  if (response.delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, response.delay))
  }
  if (response.type === 'error') {
    throw new Error(response.message)
  }
  return response.response
}

export const consumeNextRefreshResponse = async (): Promise<unknown> => {
  if (!nextRefreshResponse) {
    return undefined
  }
  const response = nextRefreshResponse
  nextRefreshResponse = undefined
  if (response.delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, response.delay))
  }
  if (response.type === 'error') {
    throw new Error(response.message)
  }
  return response.response
}
