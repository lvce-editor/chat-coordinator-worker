import type { NetworkRequestOptions } from '../NetworkRequestOptions/NetworkRequestOptions.ts'
import type { NetworkRequestResult } from '../NetworkRequestResult/NetworkRequestResult.ts'

export const makeNetworkRequest = async (options: NetworkRequestOptions): Promise<NetworkRequestResult> => {
  const { body, headers, method, url } = options
  const requestInit: RequestInit = {
    method,
  }

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body)
  }

  if (headers !== undefined) {
    requestInit.headers = headers
  }

  const response = await fetch(url, requestInit)
  const json = await response.json()
  return {
    data: json,
    headers: Object.fromEntries(response.headers.entries()),
    type: 'success',
  }
}
