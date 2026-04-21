import type { NetworkRequestOptions } from '../NetworkRequestOptions/NetworkRequestOptions.ts'
import { createMockOpenAiResponse } from '../CreateMockOpenAiResponse/CreateMockOpenAiResponse.ts'
import * as MockOpenApiStream from '../MockOpenApiStream/MockOpenApiStream.ts'

export interface ParsedNetworkResponse {
  readonly headers: Headers
  readonly json: () => Promise<any>
  readonly ok: boolean
  readonly status: number
}

export const getNetworkResponse = async (options: NetworkRequestOptions, requestInit: RequestInit): Promise<ParsedNetworkResponse> => {
  const { body, url } = options
  const mockResponseText = await MockOpenApiStream.consumeResponseText()
  if (mockResponseText !== undefined) {
    const data = createMockOpenAiResponse(body, mockResponseText)
    return {
      headers: new Headers(),
      json: async () => data,
      ok: true,
      status: 200,
    }
  }
  return fetch(url, requestInit)
}
