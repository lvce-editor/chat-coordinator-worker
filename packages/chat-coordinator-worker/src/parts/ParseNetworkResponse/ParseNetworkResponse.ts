import type { ParsedNetworkResponse } from '../GetNetworkResponse/GetNetworkResponse.ts'
import type { NetworkRequestResult } from '../NetworkRequestResult/NetworkRequestResult.ts'
import { serializeHeaders } from '../SerializeHeaders/SerializeHeaders.ts'

export const parseNetworkResponse = async (response: ParsedNetworkResponse): Promise<NetworkRequestResult> => {
  const json = await response.json()
  if (!response.ok) {
    return {
      error: json,
      statusCode: response.status,
      type: 'error',
    }
  }
  return {
    data: json,
    headers: serializeHeaders(response.headers),
    statusCode: response.status,
    type: 'success',
  }
}
