export interface MockOpenApiRequest {
  readonly headers: Readonly<Record<string, string>>
  readonly method: string
  readonly payload: unknown
  readonly url: string
}

let requests: readonly MockOpenApiRequest[] = []

export const reset = (): void => {
  requests = []
}

export const capture = (request: MockOpenApiRequest): void => {
  requests = [...requests, request]
}

export const getAll = (): readonly MockOpenApiRequest[] => {
  return requests
}
