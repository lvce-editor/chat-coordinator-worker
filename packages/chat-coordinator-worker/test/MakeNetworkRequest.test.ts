// cspell:ignore logprobs

import { afterEach, expect, jest, test } from '@jest/globals'
import { makeNetworkRequest } from '../src/parts/MakeNetworkRequest/MakeNetworkRequest.ts'
import * as MockOpenApiStream from '../src/parts/MockOpenApiStream/MockOpenApiStream.ts'
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
    data: expect.objectContaining({
      background: false,
      billing: {
        payer: 'openai',
      },
      completed_at: expect.any(Number),
      created_at: expect.any(Number),
      error: null,
      frequency_penalty: 0,
      id: expect.stringMatching(/^resp_[a-z0-9]+$/),
      incomplete_details: null,
      instructions: null,
      max_output_tokens: null,
      max_tool_calls: null,
      metadata: {},
      model: 'mock-model',
      moderation: null,
      object: 'response',
      output: [
        {
          content: [
            {
              annotations: [],
              logprobs: [],
              text: 'Hello from mock assistant',
              type: 'output_text',
            },
          ],
          id: expect.stringMatching(/^msg_[a-z0-9]+$/),
          role: 'assistant',
          status: 'completed',
          type: 'message',
        },
      ],
      parallel_tool_calls: true,
      presence_penalty: 0,
      previous_response_id: null,
      prompt_cache_key: null,
      prompt_cache_retention: 'in_memory',
      reasoning: {
        effort: null,
        summary: null,
      },
      safety_identifier: null,
      service_tier: 'default',
      status: 'completed',
      store: true,
      temperature: 1,
      text: {
        format: {
          type: 'text',
        },
        verbosity: 'medium',
      },
      tool_choice: 'auto',
      tools: [],
      top_logprobs: 0,
      top_p: 1,
      truncation: 'disabled',
      usage: {
        input_tokens: 0,
        input_tokens_details: {
          cached_tokens: 0,
        },
        output_tokens: 5,
        output_tokens_details: {
          reasoning_tokens: 0,
        },
        total_tokens: 5,
      },
      user: null,
    }),
    headers: {},
    statusCode: 200,
    size: 0,
    type: 'success',
  })
  if (result.type !== 'success') {
    throw new Error('expected success result')
  }
  expect(result.data).not.toHaveProperty('output_text')
  expect(result.data.completed_at).toBeGreaterThanOrEqual(result.data.created_at)
  expect(fetchSpy).not.toHaveBeenCalled()
})

test('make network request parses SSE mock responses with response.completed tool calls', async () => {
  MockOpenApiStream.pushChunk(
    'data: {"type":"response.completed","response":{"id":"resp_01","output":[{"type":"function_call","id":"fc_01","call_id":"call_01","name":"write_file","arguments":"{\\"content\\":\\"alpha\\nbeta\\ngamma\\",\\"uri\\":\\"file:///workspace/notes.txt\\"}","status":"completed"}],"status":"completed"}}\n\n',
  )
  MockOpenApiStream.pushChunk('data: [DONE]\n\n')
  MockOpenApiStream.finish()
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
      id: 'resp_01',
      output: [
        {
          arguments: '{"content":"alpha\nbeta\ngamma","uri":"file:///workspace/notes.txt"}',
          call_id: 'call_01',
          id: 'fc_01',
          name: 'write_file',
          status: 'completed',
          type: 'function_call',
        },
      ],
      status: 'completed',
    },
    headers: {},
    statusCode: 200,
    size: 0,
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
    size: 256,
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
    size: 256,
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
    size: 0,
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
    headers: {
      'content-type': 'application/json',
    },
    statusCode: 429,
    size: 0,
    type: 'error',
  })
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[]}',
    headers: {},
    method: 'POST',
  })
})
