import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { getOpenApiAssistantText } from '../src/parts/GetOpenApiAssistantText/GetOpenApiAssistantText.ts'

const getRequestIdFromInit = (init: unknown): string | undefined => {
  const requestInit = init as RequestInit | undefined
  const headers = requestInit?.headers as Record<string, unknown> | undefined
  const value = headers?.['x-client-request-id']
  return typeof value === 'string' ? value : undefined
}

const getRequestBodyFromInit = (init: unknown): Record<string, unknown> => {
  const requestInit = init as RequestInit | undefined
  const body = requestInit?.body
  if (typeof body !== 'string') {
    return {}
  }
  return JSON.parse(body) as Record<string, unknown>
}

test('getOpenApiAssistantText should include x-client-request-id header', async () => {
  const originalFetch = globalThis.fetch
  let fetchInvocation: readonly unknown[] | undefined
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    fetchInvocation = args
    return {
      json: async () => ({ output_text: 'hello from openai' }),
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await getOpenApiAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      'openai/gpt-4o-mini',
      'oa-key-123',
      'https://api.openai.com/v1',
      '',
      0,
    )

    expect(result).toEqual({
      text: 'hello from openai',
      type: 'success',
    })

    expect(fetchInvocation?.[0]).toBe('https://api.openai.com/v1/responses')
    expect(fetchInvocation?.[1]).toMatchObject({
      headers: {
        Authorization: 'Bearer oa-key-123',
        'Content-Type': 'application/json',
        'x-client-request-id': expect.any(String),
      },
      method: 'POST',
    })

    const requestId = getRequestIdFromInit(fetchInvocation?.[1] as RequestInit | undefined)
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    const requestBody = getRequestBodyFromInit(fetchInvocation?.[1] as RequestInit | undefined)
    expect(requestBody.include_obfuscation).toBeUndefined()
    expect(requestBody.stream_options).toBeUndefined()
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenApiAssistantText should send follow-up request when streaming function-call argument events use item_id', async () => {
  const originalFetch = globalThis.fetch
  const fetchInvocations: Array<readonly unknown[]> = []
  let requestCount = 0
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    fetchInvocations.push(args)
    requestCount += 1
    const firstResponseChunks = [
      'data: {"type":"response.output_item.added","item":{"type":"function_call","id":"fc_1","call_id":"call_1","name":"invalid_tool","arguments":""}}\n\n',
      'data: {"type":"response.function_call_arguments.delta","item_id":"fc_1","delta":"{\\"path\\":\\"index.html\\"}"}\n\n',
      'data: {"type":"response.output_item.done","item_id":"fc_1","item":{"type":"function_call","id":"fc_1","call_id":"call_1","name":"invalid_tool","arguments":"{\\"path\\":\\"index.html\\"}"}}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp_item_id","output":[]}}\n\n',
      'data: [DONE]\n\n',
    ]
    const secondResponseChunks = [
      'data: {"type":"response.output_text.delta","delta":"ok"}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp_item_id_2","output":[]}}\n\n',
      'data: [DONE]\n\n',
    ]
    const chunks = requestCount === 1 ? firstResponseChunks : secondResponseChunks
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

  try {
    const result = await getOpenApiAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'read index.html',
          time: '10:00',
        },
      ],
      'openai/gpt-4o-mini',
      'oa-key-123',
      'https://api.openai.com/v1',
      '',
      0,
      {
        stream: true,
      },
    )

    expect(result).toEqual({
      text: 'ok',
      type: 'success',
    })
    expect(fetchInvocations).toHaveLength(2)
    const secondRequestBody = getRequestBodyFromInit(fetchInvocations[1][1] as RequestInit | undefined)
    expect(secondRequestBody.previous_response_id).toBe('resp_item_id')
    expect(secondRequestBody.input).toEqual([
      {
        call_id: 'call_1',
        output: '{"error":"Unknown tool: invalid_tool"}',
        type: 'function_call_output',
      },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})
test('getOpenApiAssistantText should include include_obfuscation in stream_options when streaming and includeObfuscation is false', async () => {
  const originalFetch = globalThis.fetch
  let fetchInvocation: readonly unknown[] | undefined
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    fetchInvocation = args
    return {
      json: async () => ({ output_text: 'hello from openai' }),
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  try {
    await getOpenApiAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      'openai/gpt-4o-mini',
      'oa-key-123',
      'https://api.openai.com/v1',
      '',
      0,
      {
        includeObfuscation: false,
        stream: true,
      },
    )
    const requestBody = getRequestBodyFromInit(fetchInvocation?.[1] as RequestInit | undefined)
    expect(requestBody.include_obfuscation).toBeUndefined()
    expect(requestBody.stream_options).toEqual({
      include_obfuscation: false,
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenApiAssistantText should not include include_obfuscation when includeObfuscation is true', async () => {
  const originalFetch = globalThis.fetch
  let fetchInvocation: readonly unknown[] | undefined
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    fetchInvocation = args
    return {
      json: async () => ({ output_text: 'hello from openai' }),
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  try {
    await getOpenApiAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      'openai/gpt-4o-mini',
      'oa-key-123',
      'https://api.openai.com/v1',
      '',
      0,
      {
        includeObfuscation: true,
        stream: true,
      },
    )
    const requestBody = getRequestBodyFromInit(fetchInvocation?.[1] as RequestInit | undefined)
    expect(requestBody.include_obfuscation).toBeUndefined()
    expect(requestBody.stream_options).toBeUndefined()
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenApiAssistantText should include web_search tool when webSearchEnabled is true', async () => {
  const originalFetch = globalThis.fetch
  let fetchInvocation: readonly unknown[] | undefined
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    fetchInvocation = args
    return {
      json: async () => ({ output_text: 'hello from openai' }),
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  try {
    await getOpenApiAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      'openai/gpt-4o-mini',
      'oa-key-123',
      'https://api.openai.com/v1',
      '',
      0,
      {
        stream: false,
        webSearchEnabled: true,
      },
    )
    const requestBody = getRequestBodyFromInit(fetchInvocation?.[1] as RequestInit | undefined)
    const tools = Array.isArray(requestBody.tools) ? requestBody.tools : []
    expect(tools).toContainEqual({ type: 'web_search' })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenApiAssistantText should not include web_search tool when webSearchEnabled is false', async () => {
  const originalFetch = globalThis.fetch
  let fetchInvocation: readonly unknown[] | undefined
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    fetchInvocation = args
    return {
      json: async () => ({ output_text: 'hello from openai' }),
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  try {
    await getOpenApiAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'hello',
          time: '10:00',
        },
      ],
      'openai/gpt-4o-mini',
      'oa-key-123',
      'https://api.openai.com/v1',
      '',
      0,
      {
        stream: false,
        webSearchEnabled: false,
      },
    )
    const requestBody = getRequestBodyFromInit(fetchInvocation?.[1] as RequestInit | undefined)
    const tools = Array.isArray(requestBody.tools) ? requestBody.tools : []
    expect(tools).not.toContainEqual({ type: 'web_search' })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenApiAssistantText should execute streaming tool calls and send automatic follow-up requests', async () => {
  const originalFetch = globalThis.fetch
  const fetchInvocations: Array<readonly unknown[]> = []
  let requestCount = 0
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    fetchInvocations.push(args)
    requestCount += 1
    const firstResponseChunks = [
      'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"function_call","call_id":"call_1","name":"invalid_tool","arguments":""}}\n\n',
      'data: {"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\\"path\\":\\"index.html\\"}"}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp_1","output":[{"type":"function_call","call_id":"call_1","name":"invalid_tool","arguments":"{\\"path\\":\\"index.html\\"}"}]}}\n\n',
      'data: [DONE]\n\n',
    ]
    const secondResponseChunks = [
      'data: {"type":"response.created","response":{"id":"resp_2"}}\n\n',
      'data: {"type":"response.output_text.delta","delta":"done"}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp_2","output":[]}}\n\n',
      'data: [DONE]\n\n',
    ]
    const chunks = requestCount === 1 ? firstResponseChunks : secondResponseChunks
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

  const dataEvents: unknown[] = []
  const toolCallsChunks: unknown[] = []
  let finishedCount = 0

  try {
    const result = await getOpenApiAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'read index.html',
          time: '10:00',
        },
      ],
      'openai/gpt-4o-mini',
      'oa-key-123',
      'https://api.openai.com/v1',
      '',
      0,
      {
        onDataEvent: async (value: unknown) => {
          dataEvents.push(value)
        },
        onEventStreamFinished: async () => {
          finishedCount += 1
        },
        onToolCallsChunk: async (toolCalls) => {
          toolCallsChunks.push(toolCalls)
        },
        stream: true,
      },
    )

    expect(result).toEqual({
      text: 'done',
      type: 'success',
    })
    expect(fetchInvocations).toHaveLength(2)
    const secondRequestBody = getRequestBodyFromInit(fetchInvocations[1][1] as RequestInit | undefined)
    expect(secondRequestBody.previous_response_id).toBe('resp_1')
    expect(secondRequestBody.input).toEqual([
      {
        call_id: 'call_1',
        output: '{"error":"Unknown tool: invalid_tool"}',
        type: 'function_call_output',
      },
    ])
    expect(dataEvents).toHaveLength(6)
    expect(finishedCount).toBe(1)
    expect(toolCallsChunks.at(-1)).toEqual([
      {
        arguments: '{"path":"index.html"}',
        errorMessage: 'Unknown tool: invalid_tool',
        id: 'call_1',
        name: 'invalid_tool',
        status: 'error',
      },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getOpenApiAssistantText should include error stack in failed tool call chunks', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'FileSystem.readFile': async () => {
      const error = new TypeError("Cannot read properties of undefined (reading 'invoke')")
      error.stack = "TypeError: Cannot read properties of undefined (reading 'invoke')\n    at test:1:1"
      throw error
    },
  })
  const originalFetch = globalThis.fetch
  const fetchInvocations: Array<readonly unknown[]> = []
  let requestCount = 0
  globalThis.fetch = (async (...args: readonly unknown[]) => {
    fetchInvocations.push(args)
    requestCount += 1
    const firstResponseChunks = [
      'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"function_call","call_id":"call_1","name":"read_file","arguments":""}}\n\n',
      'data: {"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\\"uri\\":\\"file:///workspace/src/main.ts\\"}"}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp_1","output":[{"type":"function_call","call_id":"call_1","name":"read_file","arguments":"{\\"uri\\":\\"file:///workspace/src/main.ts\\"}"}]}}\n\n',
      'data: [DONE]\n\n',
    ]
    const secondResponseChunks = [
      'data: {"type":"response.created","response":{"id":"resp_2"}}\n\n',
      'data: {"type":"response.output_text.delta","delta":"done"}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp_2","output":[]}}\n\n',
      'data: [DONE]\n\n',
    ]
    const chunks = requestCount === 1 ? firstResponseChunks : secondResponseChunks
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

  const toolCallsChunks: unknown[] = []
  try {
    const result = await getOpenApiAssistantText(
      [
        {
          id: 'message-1',
          role: 'user',
          text: 'read index.html',
          time: '10:00',
        },
      ],
      'openai/gpt-4o-mini',
      'oa-key-123',
      'https://api.openai.com/v1',
      '',
      0,
      {
        onToolCallsChunk: async (toolCalls) => {
          toolCallsChunks.push(toolCalls)
        },
        stream: true,
      },
    )

    expect(result).toEqual({
      text: 'done',
      type: 'success',
    })
    expect(mockRendererRpc.invocations).toEqual([['FileSystem.readFile', 'file:///workspace/src/main.ts']])
    expect(fetchInvocations).toHaveLength(2)
    const secondRequestBody = getRequestBodyFromInit(fetchInvocations[1][1] as RequestInit | undefined)
    const input = secondRequestBody.input as readonly Record<string, unknown>[]
    const firstOutput = JSON.parse(String(input[0].output)) as Record<string, unknown>
    expect(firstOutput.errorStack).toBe("TypeError: Cannot read properties of undefined (reading 'invoke')\n    at test:1:1")
    expect(toolCallsChunks.at(-1)).toEqual([
      {
        arguments: '{"uri":"file:///workspace/src/main.ts"}',
        errorMessage: "TypeError: Cannot read properties of undefined (reading 'invoke')",
        errorStack: "TypeError: Cannot read properties of undefined (reading 'invoke')\n    at test:1:1",
        id: 'call_1',
        name: 'read_file',
        status: 'error',
      },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})
