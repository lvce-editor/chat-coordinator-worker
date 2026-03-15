// cspell:ignore openrouter
import { expect, test } from '@jest/globals'
import { ExtensionHost, RendererWorker } from '@lvce-editor/rpc-registry'
import {
  openApiApiKeyRequiredMessage,
  openApiRequestFailedMessage,
  openRouterTooManyRequestsMessage,
} from '../src/parts/chatViewStrings/chatViewStrings.ts'
import { getAiResponse } from '../src/parts/GetAiResponse/GetAiResponse.ts'
import * as MockOpenApiStream from '../src/parts/MockOpenApiStream/MockOpenApiStream.ts'

test('getAiResponse should include OpenRouter raw 429 metadata message in assistant text', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: unknown) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input instanceof Request ? input.url : ''
    if (url.endsWith('/chat/completions')) {
      return {
        json: async () => ({
          error: {
            code: 429,
            message: 'Provider returned error',
            metadata: {
              raw: 'openai/gpt-oss-120b:free is temporarily rate-limited upstream. Please retry shortly.',
            },
          },
        }),
        ok: false,
        status: 429,
      } as Response
    }
    return {
      ok: false,
      status: 500,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await getAiResponse({
      assetDir: '',
      messages: [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      mockApiCommandId: '',
      models: [{ id: 'openrouter/model', name: 'OpenRouter Model', provider: 'openRouter' }],
      nextMessageId: 2,
      openApiApiBaseUrl: 'https://api.openai.com/v1',
      openApiApiKey: '',
      openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
      openRouterApiKey: 'or-key-123',
      platform: 0,
      selectedModelId: 'openrouter/model',
      useMockApi: false,
      userText: 'hello',
    })

    expect(result.role).toBe('assistant')
    expect(result.text).toContain(openRouterTooManyRequestsMessage)
    expect(result.text).toContain('openai/gpt-oss-120b:free is temporarily rate-limited upstream. Please retry shortly.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getAiResponse should use mock api command for OpenRouter models when enabled', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'ExtensionHostManagement.activateByEvent': async () => {},
  })
  const mockExtensionHostRpc = ExtensionHost.registerMockRpc({
    'ExtensionHostCommand.executeCommand': async (_id: string, _payload: unknown) => {
      return {
        text: 'Mocked OpenRouter response from command',
        type: 'success',
      }
    },
  })

  const result = await getAiResponse({
    assetDir: '/tmp',
    messages: [
      {
        id: 'message-1',
        role: 'user',
        text: 'hello',
        time: '10:00',
      },
    ],
    mockApiCommandId: 'ChatE2e.mockApi',
    models: [{ id: 'openrouter/model', name: 'OpenRouter Model', provider: 'openRouter' }],
    nextMessageId: 2,
    openApiApiBaseUrl: 'https://api.openai.com/v1',
    openApiApiKey: '',
    openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
    openRouterApiKey: '',
    platform: 3,
    selectedModelId: 'openrouter/model',
    useMockApi: true,
    userText: 'hello',
  })

  expect(result.role).toBe('assistant')
  expect(result.text).toBe('Mocked OpenRouter response from command')
  expect(mockRendererRpc.invocations).toEqual([['ExtensionHostManagement.activateByEvent', 'onCommand:ChatE2e.mockApi', '/tmp', 3]])
  expect(mockExtensionHostRpc.invocations).toEqual([
    [
      'ExtensionHostCommand.executeCommand',
      'ChatE2e.mockApi',
      {
        messages: [
          {
            id: 'message-1',
            role: 'user',
            text: 'hello',
            time: '10:00',
          },
        ],
        modelId: 'model',
        openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
        openRouterApiKey: '',
      },
    ],
  ])
})

test('getAiResponse should map mock api error payloads to OpenRouter error text', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'ExtensionHostManagement.activateByEvent': async () => {},
  })
  const mockExtensionHostRpc = ExtensionHost.registerMockRpc({
    'ExtensionHostCommand.executeCommand': async (_id: string, _payload: unknown) => {
      return {
        details: 'too-many-requests',
        limitInfo: {
          limitRemaining: 2,
          retryAfter: '30',
        },
        rawMessage: 'temporary overload',
        type: 'error',
      }
    },
  })

  const result = await getAiResponse({
    assetDir: '/tmp',
    messages: [
      {
        id: 'message-1',
        role: 'user',
        text: 'hello',
        time: '10:00',
      },
    ],
    mockApiCommandId: 'ChatE2e.mockApi',
    models: [{ id: 'openrouter/model', name: 'OpenRouter Model', provider: 'openRouter' }],
    nextMessageId: 2,
    openApiApiBaseUrl: 'https://api.openai.com/v1',
    openApiApiKey: '',
    openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
    openRouterApiKey: '',
    platform: 3,
    selectedModelId: 'openrouter/model',
    useMockApi: true,
    userText: 'hello',
  })

  expect(result.role).toBe('assistant')
  expect(result.text).toContain(openRouterTooManyRequestsMessage)
  expect(result.text).toContain('temporary overload')
  expect(result.text).toContain('Retry after: 30.')
  expect(result.text).toContain('Credits remaining: 2.')
  expect(mockRendererRpc.invocations).toEqual([['ExtensionHostManagement.activateByEvent', 'onCommand:ChatE2e.mockApi', '/tmp', 3]])
  expect(mockExtensionHostRpc.invocations).toEqual([
    [
      'ExtensionHostCommand.executeCommand',
      'ChatE2e.mockApi',
      {
        messages: [
          {
            id: 'message-1',
            role: 'user',
            text: 'hello',
            time: '10:00',
          },
        ],
        modelId: 'model',
        openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
        openRouterApiKey: '',
      },
    ],
  ])
})

test('getAiResponse should return OpenAI key required message for OpenAPI model when key is missing', async () => {
  const result = await getAiResponse({
    assetDir: '',
    messages: [
      {
        id: 'message-1',
        role: 'user',
        text: 'hello',
        time: '10:00',
      },
    ],
    mockApiCommandId: '',
    models: [{ id: 'openapi/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openApi' }],
    nextMessageId: 2,
    openApiApiBaseUrl: 'https://api.openai.com/v1',
    openApiApiKey: '',
    openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
    openRouterApiKey: '',
    platform: 0,
    selectedModelId: 'openapi/gpt-4o-mini',
    useMockApi: false,
    userText: 'hello',
  })

  expect(result.role).toBe('assistant')
  expect(result.text).toBe(openApiApiKeyRequiredMessage)
})

test('getAiResponse should use mock streaming chunks for OpenAPI model when mock mode is enabled', async () => {
  MockOpenApiStream.reset()
  MockOpenApiStream.pushChunk('Hel')
  MockOpenApiStream.pushChunk('lo')
  MockOpenApiStream.finish()
  const chunks: string[] = []

  const result = await getAiResponse({
    assetDir: '',
    messages: [
      {
        id: 'message-1',
        role: 'user',
        text: 'hello',
        time: '10:00',
      },
    ],
    mockApiCommandId: '',
    models: [{ id: 'openapi/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openApi' }],
    nextMessageId: 2,
    onTextChunk: async (chunk: string) => {
      chunks.push(chunk)
    },
    openApiApiBaseUrl: 'https://api.openai.com/v1',
    openApiApiKey: '',
    openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
    openRouterApiKey: '',
    platform: 0,
    selectedModelId: 'openapi/gpt-4.1-mini',
    streamingEnabled: true,
    useMockApi: true,
    userText: 'hello',
  })

  expect(result.role).toBe('assistant')
  expect(result.text).toBe('Hello')
  expect(chunks).toEqual(['Hel', 'lo'])
})

test('getAiResponse should include OpenAI 429 quota error message details in assistant text', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return {
      json: async () => ({
        error: {
          code: 'insufficient_quota',
          message:
            'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.',
          param: null,
          type: 'insufficient_quota',
        },
      }),
      ok: false,
      status: 429,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await getAiResponse({
      assetDir: '',
      messages: [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      mockApiCommandId: '',
      models: [{ id: 'openapi/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openApi' }],
      nextMessageId: 2,
      openApiApiBaseUrl: 'https://api.openai.com/v1',
      openApiApiKey: 'oa-key-123',
      openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
      openRouterApiKey: '',
      platform: 0,
      selectedModelId: 'openapi/gpt-4o-mini',
      useMockApi: false,
      userText: 'hello',
    })

    expect(result.role).toBe('assistant')
    expect(result.text).toContain('OpenAI rate limit exceeded (429: insufficient_quota) [insufficient_quota].')
    expect(result.text).toContain('You exceeded your current quota, please check your plan and billing details.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getAiResponse should include OpenAI http error details for non-429 responses', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return {
      json: async () => ({
        error: {
          code: 'invalid_api_key',
          message: 'Incorrect API key provided.',
          type: 'invalid_request_error',
        },
      }),
      ok: false,
      status: 401,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await getAiResponse({
      assetDir: '',
      messages: [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      mockApiCommandId: '',
      models: [{ id: 'openapi/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openApi' }],
      nextMessageId: 2,
      openApiApiBaseUrl: 'https://api.openai.com/v1',
      openApiApiKey: 'oa-key-123',
      openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
      openRouterApiKey: '',
      platform: 0,
      selectedModelId: 'openapi/gpt-4o-mini',
      useMockApi: false,
      userText: 'hello',
    })

    expect(result.role).toBe('assistant')
    expect(result.text).toBe('OpenAI request failed (Status 401): Invalid API key. Please verify your OpenAI API key in Chat Settings.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getAiResponse should fall back to generic OpenAI request failed message when no error payload is returned', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return {
      json: async () => ({}),
      ok: false,
      status: 500,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await getAiResponse({
      assetDir: '',
      messages: [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      mockApiCommandId: '',
      models: [{ id: 'openapi/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openApi' }],
      nextMessageId: 2,
      openApiApiBaseUrl: 'https://api.openai.com/v1',
      openApiApiKey: 'oa-key-123',
      openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
      openRouterApiKey: '',
      platform: 0,
      selectedModelId: 'openapi/gpt-4o-mini',
      useMockApi: false,
      userText: 'hello',
    })

    expect(result.role).toBe('assistant')
    expect(result.text).toBe('OpenAI request failed (status 500).')
    expect(result.text).not.toBe(openApiRequestFailedMessage)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getAiResponse should stream OpenAI chunks when enabled', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = (async (input: unknown) => {
    requestedUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input instanceof Request ? input.url : ''
    const chunks = [
      'data: {"type":"response.output_text.delta","delta":"Hello"}\n\n',
      'data: {"type":"response.output_text.delta","delta":" world"}\n\n',
      'data: {"type":"response.completed"}\n\n',
      'data: [DONE]\n\n',
    ]
    let index = 0
    return {
      body: {
        getReader: () => ({
          read: async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
            if (index >= chunks.length) {
              return { done: true, value: undefined }
            }
            const value = new TextEncoder().encode(chunks[index++])
            return { done: false, value }
          },
        }),
      },
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  const streamedChunks: string[] = []
  try {
    const result = await getAiResponse({
      assetDir: '',
      messages: [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      mockApiCommandId: '',
      models: [{ id: 'openapi/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openApi' }],
      nextMessageId: 2,
      onTextChunk: async (chunk: string) => {
        streamedChunks.push(chunk)
      },
      openApiApiBaseUrl: 'https://api.openai.com/v1',
      openApiApiKey: 'oa-key-123',
      openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
      openRouterApiKey: '',
      platform: 0,
      selectedModelId: 'openapi/gpt-4o-mini',
      streamingEnabled: true,
      useMockApi: false,
      userText: 'hello',
    })

    expect(requestedUrl).toBe('https://api.openai.com/v1/responses')
    expect(streamedChunks).toEqual(['Hello', ' world'])
    expect(result.role).toBe('assistant')
    expect(result.text).toBe('Hello world')
  } finally {
    globalThis.fetch = originalFetch
  }
})
