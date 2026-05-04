import type { NetworkRequestOptions } from '../NetworkRequestOptions/NetworkRequestOptions.ts'
import type { NetworkRequestResult } from '../NetworkRequestResult/NetworkRequestResult.ts'
import { getInitData } from '../GetInitData/GetInitData.ts'
import { getNetworkResponse } from '../GetNetworkResponse/GetNetworkResponse.ts'
import { parseNetworkResponse } from '../ParseNetworkResponse/ParseNetworkResponse.ts'

export const makeNetworkRequest = async (options: NetworkRequestOptions): Promise<NetworkRequestResult> => {
  const requestInit = getInitData(options)
  const response = await getNetworkResponse(options, requestInit)
  return parseNetworkResponse(response)
}
