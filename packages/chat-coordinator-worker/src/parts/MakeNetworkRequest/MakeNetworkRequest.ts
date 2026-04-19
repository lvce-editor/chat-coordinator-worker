import type { NetworkRequestOptions } from '../NetworkRequestOptions/NetworkRequestOptions.ts'
import type { NetworkRequestResult } from '../NetworkRequestResult/NetworkRequestResult.ts'

export const makeNetworkRequest = async (options: NetworkRequestOptions): Promise<NetworkRequestResult> => {
  const { body, headers, method, url } = options
  const response = await fetch(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers,
    method,
  })
  const json = await response.json()
  return {
    data: json,
    type: 'success',
  }
}
