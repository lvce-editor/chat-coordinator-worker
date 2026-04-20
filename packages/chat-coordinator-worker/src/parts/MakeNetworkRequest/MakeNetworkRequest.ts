import type { NetworkRequestOptions } from '../NetworkRequestOptions/NetworkRequestOptions.ts'
import type { NetworkRequestResult } from '../NetworkRequestResult/NetworkRequestResult.ts'
import { createMockOpenAiResponse } from '../CreateMockOpenAiResponse/CreateMockOpenAiResponse.ts'
import * as MockOpenApiStream from '../MockOpenApiStream/MockOpenApiStream.ts'
import { serializeHeaders } from '../SerializeHeaders/SerializeHeaders.ts'

interface ParsedNetworkResponse {
  readonly headers: Headers
  readonly json: () => Promise<any>
  readonly ok: boolean
  readonly status: number
}

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

export const makeNetworkRequest = async (options: NetworkRequestOptions): Promise<NetworkRequestResult> => {
  const requestInit = getInitData(options)
  const response = await getNetworkResponse(options, requestInit)
  return parseNetworkResponse(response)
}
