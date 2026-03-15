// cspell:ignore openrouter
import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { getOpenRouterAssistantText } from '../src/parts/GetOpenRouterAssistantText/GetOpenRouterAssistantText.ts'

const parseJsonRequestBody = (body: unknown): any => {
  if (typeof body !== 'string') {
    return {}
  }
  return JSON.parse(body)
}

const getRequestIdFromInit = (init: unknown): string | undefined => {
  const requestInit = init as RequestInit | undefined
  const headers = requestInit?.headers as Record<string, unknown> | undefined
  const value = headers?.['x-client-request-id']
  return typeof value === 'string' ? value : undefined
}

test('getOpenRouterAssistantText should return success result when response is ok', async () => {
  const originalFetch = globalThis.fetch
  let fetchInvocation: readonly unknown[] | undefined
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    fetchInvocation = args
    return {
      json: async () => ({ choices: [{ message: { content: 'hello from openrouter' } }] }),
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await getOpenRouterAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
        {
          id: 'message-2',
          role: 'assistant',
          text: 'Hi! How can I help?',
          time: '10:01',
        },
        {
          id: 'message-3',
          role: 'user',
          text: 'Explain recursion.',
          time: '10:02',
        },
      ],
      'openrouter/model',
      'or-key-123',
      'https://openrouter.ai/api/v1',
      '',
      0,
    )
    expect(result).toEqual({
      text: 'hello from openrouter',
      type: 'success',
    })
    expect(fetchInvocation).toBeDefined()
    expect(fetchInvocation?.[0]).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(fetchInvocation?.[1]).toMatchObject({
      headers: {
        Authorization: 'Bearer or-key-123',
        'Content-Type': 'application/json',
        'x-client-request-id': expect.any(String),
      },
      method: 'POST',
    })
    const requestId = getRequestIdFromInit(fetchInvocation?.[1] as RequestInit | undefined)
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    const payload = parseJsonRequestBody((fetchInvocation?.[1] as RequestInit | undefined)?.body)
    expect(payload.messages).toEqual([
      { content: 'hello', role: 'user' },
      { content: 'Hi! How can I help?', role: 'assistant' },
      { content: 'Explain recursion.', role: 'user' },
    ])
    expect(payload.model).toBe('openrouter/model')
    expect(payload.tool_choice).toBe('auto')
    expect(payload.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          function: expect.objectContaining({ name: 'read_file' }),
          type: 'function',
        }),
        expect.objectContaining({
          function: expect.objectContaining({ name: 'write_file' }),
          type: 'function',
        }),
        expect.objectContaining({
          function: expect.objectContaining({ name: 'list_files' }),
          type: 'function',
        }),
      ]),
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenRouterAssistantText should return request-failed error result when fetch throws', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    throw new Error('network failure')
  }) as typeof globalThis.fetch

  try {
    const result = await getOpenRouterAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      'openrouter/model',
      'or-key-123',
      'https://openrouter.ai/api/v1',
      '',
      0,
    )
    expect(result).toEqual({
      details: 'request-failed',
      type: 'error',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenRouterAssistantText should return too-many-requests error result for 429', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return {
      ok: false,
      status: 429,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await getOpenRouterAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      'openrouter/model',
      'or-key-123',
      'https://openrouter.ai/api/v1',
      '',
      0,
    )
    expect(result).toEqual({
      details: 'too-many-requests',
      statusCode: 429,
      type: 'error',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenRouterAssistantText should include limit info for 429 when auth key endpoint returns usage data', async () => {
  const originalFetch = globalThis.fetch
  let invocationCount = 0
  const requestIds: string[] = []
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    const input = args[0]
    const init = args[1] as RequestInit | undefined
    invocationCount++
    const requestId = getRequestIdFromInit(init)
    if (requestId) {
      requestIds.push(requestId)
    }
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input instanceof Request ? input.url : ''
    if (url.endsWith('/chat/completions')) {
      return {
        headers: {
          get: (name: string) => (name === 'retry-after' ? '30' : null),
        },
        ok: false,
        status: 429,
      } as Response
    }
    return {
      json: async () => ({
        data: {
          limit_remaining: 1.5,
          limit_reset: 'daily',
          usage: 12.25,
          usage_daily: 0.75,
        },
      }),
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await getOpenRouterAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      'openrouter/model',
      'or-key-123',
      'https://openrouter.ai/api/v1',
      '',
      0,
    )
    expect(result).toEqual({
      details: 'too-many-requests',
      limitInfo: {
        limitRemaining: 1.5,
        limitReset: 'daily',
        retryAfter: '30',
        usage: 12.25,
        usageDaily: 0.75,
      },
      statusCode: 429,
      type: 'error',
    })
    expect(invocationCount).toBe(2)
    expect(requestIds).toHaveLength(2)
    expect(requestIds[0]).not.toBe(requestIds[1])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenRouterAssistantText should include raw metadata message for 429', async () => {
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
    const result = await getOpenRouterAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      'openrouter/model',
      'or-key-123',
      'https://openrouter.ai/api/v1',
      '',
      0,
    )
    expect(result).toEqual({
      details: 'too-many-requests',
      rawMessage: 'openai/gpt-oss-120b:free is temporarily rate-limited upstream. Please retry shortly.',
      statusCode: 429,
      type: 'error',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenRouterAssistantText should execute read_file tool calls and continue completion', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'ExtensionHostManagement.activateByEvent': async () => {},
    'FileSystem.readFile': async (uri: string) => {
      expect(uri).toBe('file:///workspace/README.md')
      return '# Workspace Readme'
    },
  })
  const originalFetch = globalThis.fetch
  let invocationCount = 0
  globalThis.fetch = (async () => {
    invocationCount++
    if (invocationCount === 1) {
      return {
        json: async () => ({
          choices: [
            {
              message: {
                content: '',
                role: 'assistant',
                tool_calls: [
                  {
                    function: {
                      arguments: JSON.stringify({ uri: 'file:///workspace/README.md' }),
                      name: 'read_file',
                    },
                    id: 'tool-1',
                    type: 'function',
                  },
                ],
              },
            },
          ],
        }),
        ok: true,
        status: 200,
      } as Response
    }
    return {
      json: async () => ({
        choices: [{ message: { content: 'Loaded README successfully.' } }],
      }),
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await getOpenRouterAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'read README.md',
          time: '10:00',
        },
      ],
      'openrouter/model',
      'or-key-123',
      'https://openrouter.ai/api/v1',
      '/tmp',
      3,
    )
    expect(result).toEqual({
      text: 'Loaded README successfully.',
      type: 'success',
    })
    expect(mockRendererRpc.invocations).toEqual([['FileSystem.readFile', 'file:///workspace/README.md']])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenRouterAssistantText should block tool paths outside workspace', async () => {
  const originalFetch = globalThis.fetch
  const requests: Array<{ readonly messages?: ReadonlyArray<Readonly<Record<string, unknown>>> }> = []
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    const init = args[1] as RequestInit | undefined
    requests.push((init ? parseJsonRequestBody(init.body) : {}) as { readonly messages?: ReadonlyArray<Readonly<Record<string, unknown>>> })
    if (requests.length === 1) {
      return {
        json: async () => ({
          choices: [
            {
              message: {
                content: '',
                role: 'assistant',
                tool_calls: [
                  {
                    function: {
                      arguments: JSON.stringify({ path: '../secret.txt' }),
                      name: 'read_file',
                    },
                    id: 'tool-1',
                    type: 'function',
                  },
                ],
              },
            },
          ],
        }),
        ok: true,
        status: 200,
      } as Response
    }
    return {
      json: async () => ({
        choices: [{ message: { content: 'Denied as expected.' } }],
      }),
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await getOpenRouterAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'read ../secret.txt',
          time: '10:00',
        },
      ],
      'openrouter/model',
      'or-key-123',
      'https://openrouter.ai/api/v1',
      '',
      0,
    )
    expect(result).toEqual({
      text: 'Denied as expected.',
      type: 'success',
    })
    const secondRequestMessages = requests[1]?.messages ?? []
    const toolResultMessage = secondRequestMessages.find((message) => message.role === 'tool')
    const toolResultContent = typeof toolResultMessage?.content === 'string' ? toolResultMessage.content : ''
    expect(toolResultContent).toContain('Access denied')
  } finally {
    globalThis.fetch = originalFetch
  }
})
