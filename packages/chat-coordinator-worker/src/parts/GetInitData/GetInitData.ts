import type { NetworkRequestOptions } from '../NetworkRequestOptions/NetworkRequestOptions.ts'

export const getInitData = (options: NetworkRequestOptions): RequestInit => {
  const { body, headers, method } = options
  const requestInit: RequestInit = {
    method,
  }

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body)
  }

  if (headers !== undefined) {
    requestInit.headers = headers
  }

  return requestInit
}
