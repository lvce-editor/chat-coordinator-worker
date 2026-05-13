import { afterEach, expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { aiLoopIteration } from '../src/parts/AiLoopIteration/AiLoopIteration.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

test('aiLoopIteration resumes stored tool results as function_call_output request items', async () => {
  const rpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async () => undefined,
    'ChatStorage.appendEvent': async () => undefined,
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'handle-submit',
        value: 'add one line to notes.txt',
      },
      {
        requestId: 'request-1',
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCallResults: [
          {
            callId: 'call_1',
            type: 'success',
            value: {
              content: 'alpha\nbeta\ngamma',
              uri: 'file:///workspace/notes.txt',
            },
          },
        ],
        turnId: 'turn-1',
        type: 'tool-calls-finished',
      },
    ],
  })
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000201')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_201'],
    ]),
    json: async () => ({
      id: 'resp_201',
      output_text: 'Done',
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await aiLoopIteration({
    headers: {},
    modelId: 'gpt-4.1-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'ignored fallback',
    toolCallResults: [],
    toolCalls: [],
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      id: 'resp_201',
      output_text: 'Done',
      status: 'completed',
    },
    toolCallResults: [],
    toolCalls: [],
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
      body: '{"input":[{"content":"You are a helpful assistant.","role":"system"},{"content":[{"text":"add one line to notes.txt","type":"input_text"}],"role":"user"},{"call_id":"call_1","output":"{\\"content\\":\\"alpha\\\\nbeta\\\\ngamma\\",\\"uri\\":\\"file:///workspace/notes.txt\\"}","type":"function_call_output"}],"model":"gpt-4.1-mini"}',
    headers: {},
    method: 'POST',
  })
  expect(rpc.invocations).toEqual([
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendDebugEvent',
      {
        body: {
          input: [
            {
              content: 'You are a helpful assistant.',
              role: 'system',
            },
            {
              content: [
                {
                  text: 'add one line to notes.txt',
                  type: 'input_text',
                },
              ],
              role: 'user',
            },
            {
              call_id: 'call_1',
              output: '{"content":"alpha\\nbeta\\ngamma","uri":"file:///workspace/notes.txt"}',
              type: 'function_call_output',
            },
          ],
          model: 'gpt-4.1-mini',
        },
        headers: {},
        method: 'POST',
        requestId: '00000000-0000-4000-8000-000000000201',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-1',
        type: 'ai-request',
        url: 'https://api.openai.com/v1/responses',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: '00000000-0000-4000-8000-000000000201',
          role: 'assistant',
          text: 'Done',
          time: '00:00',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req_201',
        },
        requestId: '00000000-0000-4000-8000-000000000201',
        sessionId: 'session-1',
        statusCode: 200,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [],
        turnId: 'turn-1',
        type: 'ai-response',
        value: {
          id: 'resp_201',
          output_text: 'Done',
          status: 'completed',
        },
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
})
