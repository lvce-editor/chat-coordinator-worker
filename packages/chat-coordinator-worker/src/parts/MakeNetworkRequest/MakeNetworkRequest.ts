import type { NetworkRequestOptions } from '../NetworkRequestOptions/NetworkRequestOptions.ts'
import type { NetworkRequestResult } from '../NetworkRequestResult/NetworkRequestResult.ts'

export const makeNetworkRequest = async (options: NetworkRequestOptions): Promise<NetworkRequestResult> => {
  const { method, url } = options
  const response = await fetch(url, {
    method,
  })
  const json = await response.json()
  return {
    data: json,
    type: 'success',
  }
}
