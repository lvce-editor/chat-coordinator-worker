import { afterEach, expect, jest, test } from '@jest/globals'
import * as MockOpenApiStream from '../src/parts/MockOpenApiStream/MockOpenApiStream.ts'
import { makeNetworkRequest } from '../src/parts/MakeNetworkRequest/MakeNetworkRequest.ts'
import { registerMockResponse } from '../src/parts/RegisterMockResponse/RegisterMockResponse.ts'

afterEach(() => {
  jest.restoreAllMocks()
  MockOpenApiStream.reset()
})

test('make network request returns registered mock response without calling fetch', async () => {
  registerMockResponse({
    text: 'Hello from mock assistant',
  })
  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  const result = await makeNetworkRequest({
    body: { input: [] },
    headers: {
      Authorization: 'Bearer test-key',
    },
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      created_at: 0,
      id: 'resp_mock_0001',
      model: 'mock-model',
      object: 'response',
      output: [
        {
          content: [
            {
              annotations: [],
              text: 'Hello from mock assistant',
              type: 'output_text',
            },
          ],
          id: 'msg_mock_0001',
          role: 'assistant',
          status: 'completed',
          type: 'message',
        },
      ],
      output_text: 'Hello from mock assistant',
      parallel_tool_calls: true,
      status: 'completed',
      tools: [],
    },
    headers: {},
    statusCode: 200,
    type: 'success',
  })
  expect(fetchSpy).not.toHaveBeenCalled()
})

test('make network request returns response headers', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_123'],
    ]),
    json: async () => ({
      id: 'resp_1',
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await makeNetworkRequest({
    body: { input: [] },
    headers: {
      Authorization: 'Bearer test-key',
    },
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      id: 'resp_1',
      status: 'completed',
    },
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'req_123',
    },
    statusCode: 200,
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[]}',
    headers: {
      Authorization: 'Bearer test-key',
    },
    method: 'POST',
  })
})

test('make network request omits body and headers when not provided', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([['content-type', 'application/json']]),
    json: async () => ({
      ok: true,
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await makeNetworkRequest({
    method: 'GET',
    url: 'https://example.com/data',
  })

  expect(result).toEqual({
    data: {
      ok: true,
    },
    headers: {
      'content-type': 'application/json',
    },
    statusCode: 200,
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledWith('https://example.com/data', {
    method: 'GET',
  })
})

test('make network request returns error result for non-2xx responses', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([['content-type', 'application/json']]),
    json: async () => ({
      error: {
        message: 'rate limited',
      },
    }),
    ok: false,
    status: 429,
  } as any)

  const result = await makeNetworkRequest({
    body: { input: [] },
    headers: {},
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    error: {
      error: {
        message: 'rate limited',
      },
    },
    statusCode: 429,
    type: 'error',
  })
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[]}',
    headers: {},
    method: 'POST',
  })
})
