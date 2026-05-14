// cspell:ignore logprobs

import { afterEach, expect, jest, test } from '@jest/globals'
import { makeAiRequest } from '../src/parts/MakeAiRequest/MakeAiRequest.ts'
import * as MockOpenApiStream from '../src/parts/MockOpenApiStream/MockOpenApiStream.ts'
import { registerMockResponse } from '../src/parts/RegisterMockResponse/RegisterMockResponse.ts'

afterEach(() => {
  jest.restoreAllMocks()
  MockOpenApiStream.reset()
})

test('make ai request uses registered mock response text', async () => {
  registerMockResponse({
    text: 'Hello from mock assistant',
  })
  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  const result = await makeAiRequest({
    headers: {
      Authorization: 'Bearer test-key',
    },
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    toolCalls: [],
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
      model: 'gpt-5-mini',
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
        input_tokens: 8,
        input_tokens_details: {
          cached_tokens: 0,
        },
        output_tokens: 5,
        output_tokens_details: {
          reasoning_tokens: 0,
        },
        total_tokens: 13,
      },
      user: null,
    }),
    headers: {},
    size: 0,
    statusCode: 200,
    type: 'success',
  })
  if (result.type !== 'success') {
    throw new Error('expected success result')
  }
  expect(result.data).not.toHaveProperty('output_text')
  expect(result.data.completed_at).toBeGreaterThanOrEqual(result.data.created_at)
  expect(fetchSpy).not.toHaveBeenCalled()
})

test('make ai request forwards the system prompt and returns response data', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_123'],
    ]),
    json: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      id: 'resp_1',
      output_text: 'Hello from assistant',
      status: 'completed',
    }),
    ok: true,
    size: 321,
    status: 200,
  } as any)

  const result = await makeAiRequest({
    headers: {
      Authorization: 'Bearer test-key',
    },
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    toolCalls: [],
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      id: 'resp_1',
      output_text: 'Hello from assistant',
      status: 'completed',
    },
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'req_123',
    },
    size: 321,
    statusCode: 200,
    // text: 'Hello from assistant',
    // toolCalls: [],
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"},{"content":"Hello world","role":"user"}],"model":"gpt-5-mini"}',
    headers: {
      Authorization: 'Bearer test-key',
    },
    method: 'POST',
  })
})

test('make ai request extracts assistant text from output items', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_124'],
    ]),
    json: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      id: 'resp_2',
      output: [
        {
          content: [
            {
              text: 'Hello',
              type: 'output_text',
            },
            {
              text: ' world',
              type: 'output_text',
            },
          ],
        },
      ],
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await makeAiRequest({
    headers: {},
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    toolCalls: [],
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      id: 'resp_2',
      output: [
        {
          content: [
            {
              text: 'Hello',
              type: 'output_text',
            },
            {
              text: ' world',
              type: 'output_text',
            },
          ],
        },
      ],
      status: 'completed',
    },
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'req_124',
    },
    size: 0,
    statusCode: 200,
    // text: 'Hello world',
    // toolCalls: [],
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

test('make ai request extracts tool calls from response output items', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_125'],
    ]),
    json: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      id: 'resp_3',
      output: [
        {
          arguments: '{"query":"status"}',
          call_id: 'tool_1',
          name: 'read_status',
          type: 'function_call',
        },
      ],
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await makeAiRequest({
    headers: {},
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    toolCalls: [],
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      id: 'resp_3',
      output: [
        {
          arguments: '{"query":"status"}',
          call_id: 'tool_1',
          name: 'read_status',
          type: 'function_call',
        },
      ],
      status: 'completed',
    },
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'req_125',
    },
    size: 0,
    statusCode: 200,
    // text: undefined,
    // toolCalls: [
    //   {
    //     args: {
    //       query: 'status',
    //     },
    //     id: 'tool_1',
    //   },
    // ],
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})

test('make ai request returns error result for non-2xx responses', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_429'],
    ]),
    json: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      error: {
        message: 'rate limited',
      },
    }),
    ok: false,
    status: 429,
  } as any)

  const result = await makeAiRequest({
    headers: {
      Authorization: 'Bearer test-key',
    },
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    toolCalls: [],
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    error: {
      error: {
        message: 'rate limited',
      },
    },
    size: 0,
    statusCode: 429,
    type: 'error',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"},{"content":"Hello world","role":"user"}],"model":"gpt-5-mini"}',
    headers: {
      Authorization: 'Bearer test-key',
    },
    method: 'POST',
  })
})

test('make ai request propagates network failures', async () => {
  const error = new Error('request failed')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(error)

  await expect(
    makeAiRequest({
      headers: {},
      modelId: 'gpt-5-mini',
      providerId: 'openai',
      systemPrompt: 'You are a helpful assistant.',
      text: 'Hello world',
      toolCallResults: [],
      toolCalls: [],
      url: 'https://api.openai.com/v1/responses',
    }),
  ).rejects.toThrow(error)
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"},{"content":"Hello world","role":"user"}],"model":"gpt-5-mini"}',
    headers: {},
    method: 'POST',
  })
})
