import type { NetworkRequestOptions } from '../NetworkRequestOptions/NetworkRequestOptions.ts'
import { createMockOpenAiResponse } from '../CreateMockOpenAiResponse/CreateMockOpenAiResponse.ts'
import * as MockBackendCompletion from '../MockBackendCompletion/MockBackendCompletion.ts'
import * as MockOpenApiStream from '../MockOpenApiStream/MockOpenApiStream.ts'

export interface ParsedNetworkResponse {
  readonly headers: Headers
  readonly json: () => Promise<any>
  readonly ok: boolean
  readonly size: number
  readonly status: number
}

const createParsedResponse = (ok: boolean, status: number, body: unknown): ParsedNetworkResponse => {
  return {
    headers: new Headers(),
    json: async () => body,
    ok,
    size: 0,
    status,
  }
}

export const getNetworkResponse = async (options: NetworkRequestOptions, requestInit: RequestInit): Promise<ParsedNetworkResponse> => {
  const { body, providerId, url } = options
  if (providerId === 'backend') {
    const mockErrorResponse = MockBackendCompletion.takeErrorResponse()
    if (mockErrorResponse) {
      return createParsedResponse(false, mockErrorResponse.statusCode, mockErrorResponse.body)
    }
    const mockResponse = MockBackendCompletion.takeResponse()
    if (mockResponse) {
      return createParsedResponse(true, 200, mockResponse.body)
    }
  }
  const mockResponseText = await MockOpenApiStream.consumeResponseText()
  if (mockResponseText !== undefined) {
    const data = createMockOpenAiResponse(body, mockResponseText)
    return createParsedResponse(true, 200, data)
  }
  const response = await fetch(url, requestInit)
  return {
    headers: response.headers,
    json: response.json.bind(response),
    ok: response.ok,
    size: typeof response.size === 'number' ? response.size : 0,
    status: response.status,
  }
}
