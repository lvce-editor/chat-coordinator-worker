import { afterEach, expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { getStoredMessages } from '../src/parts/GetStoredMessages/GetStoredMessages.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

test('getStoredMessages reads mixed history event shapes in order', async () => {
  ChatStorageWorker.registerMockRpc({
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        message: {
          role: 'user',
          text: 'first user turn',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:00.000Z',
        type: 'chat-message-added',
      },
      {
        message: {
          content: [
            {
              text: 'first assistant turn',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:01.000Z',
        type: 'message',
      },
      {
        message: {
          role: 'user',
          text: 'second user turn',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:02.000Z',
        type: 'chat-message-added',
      },
    ],
  })

  const messages = await getStoredMessages('session-1', 'fallback')

  expect(messages).toEqual([
    {
      content: [
        {
          text: 'first user turn',
          type: 'input_text',
        },
      ],
      role: 'user',
    },
    {
      content: [
        {
          text: 'first assistant turn',
          type: 'input_text',
        },
      ],
      role: 'assistant',
    },
    {
      content: [
        {
          text: 'second user turn',
          type: 'input_text',
        },
      ],
      role: 'user',
    },
  ])
})

test('getStoredMessages falls back to message.text when content is empty or non-text', async () => {
  ChatStorageWorker.registerMockRpc({
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        message: {
          content: [
            {
              text: 'ignored because part type is unsupported',
              type: 'output_text',
            },
          ],
          role: 'assistant',
          text: 'assistant fallback text',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:00.000Z',
        type: 'message',
      },
      {
        message: {
          content: [
            {
              text: 'user input text part',
              type: 'input_text',
            },
          ],
          role: 'user',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:01.000Z',
        type: 'message',
      },
    ],
  })

  const messages = await getStoredMessages('session-1', 'fallback')

  expect(messages).toEqual([
    {
      content: [
        {
          text: 'assistant fallback text',
          type: 'input_text',
        },
      ],
      role: 'assistant',
    },
    {
      content: [
        {
          text: 'user input text part',
          type: 'input_text',
        },
      ],
      role: 'user',
    },
  ])
})

test('getStoredMessages keeps every prior turn as a separate structured message', async () => {
  ChatStorageWorker.registerMockRpc({
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        message: {
          role: 'user',
          text: 'user 1',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:00.000Z',
        type: 'chat-message-added',
      },
      {
        message: {
          role: 'assistant',
          text: 'assistant 1',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:01.000Z',
        type: 'chat-message-added',
      },
      {
        message: {
          role: 'user',
          text: 'user 2',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:02.000Z',
        type: 'chat-message-added',
      },
      {
        message: {
          role: 'assistant',
          text: 'assistant 2',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:03.000Z',
        type: 'chat-message-added',
      },
      {
        message: {
          role: 'user',
          text: 'user 3',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:04.000Z',
        type: 'chat-message-added',
      },
    ],
  })

  const messages = await getStoredMessages('session-1', 'fallback')

  expect(messages).toEqual([
    {
      content: [
        {
          text: 'user 1',
          type: 'input_text',
        },
      ],
      role: 'user',
    },
    {
      content: [
        {
          text: 'assistant 1',
          type: 'input_text',
        },
      ],
      role: 'assistant',
    },
    {
      content: [
        {
          text: 'user 2',
          type: 'input_text',
        },
      ],
      role: 'user',
    },
    {
      content: [
        {
          text: 'assistant 2',
          type: 'input_text',
        },
      ],
      role: 'assistant',
    },
    {
      content: [
        {
          text: 'user 3',
          type: 'input_text',
        },
      ],
      role: 'user',
    },
  ])
})

test('getStoredMessages unwraps stored chat-view events before converting them to request inputs', async () => {
  ChatStorageWorker.registerMockRpc({
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        eventId: 1,
        message: {
          message: {
            content: [
              {
                text: 'user 1',
                type: 'text',
              },
            ],
            role: 'user',
          },
          sessionId,
          timestamp: '2026-05-15T00:00:00.000Z',
          type: 'message',
        },
        sessionId,
      },
      {
        eventId: 2,
        message: {
          message: {
            content: [
              {
                text: 'assistant 1',
                type: 'text',
              },
            ],
            role: 'assistant',
          },
          sessionId,
          timestamp: '2026-05-15T00:00:01.000Z',
          type: 'message',
        },
        sessionId,
      },
      {
        eventId: 3,
        message: {
          message: {
            content: [
              {
                text: 'user 2',
                type: 'text',
              },
            ],
            role: 'user',
          },
          sessionId,
          timestamp: '2026-05-15T00:00:02.000Z',
          type: 'message',
        },
        sessionId,
      },
    ],
  })

  const messages = await getStoredMessages('session-1', 'fallback')

  expect(messages).toEqual([
    {
      content: [
        {
          text: 'user 1',
          type: 'input_text',
        },
      ],
      role: 'user',
    },
    {
      content: [
        {
          text: 'assistant 1',
          type: 'input_text',
        },
      ],
      role: 'assistant',
    },
    {
      content: [
        {
          text: 'user 2',
          type: 'input_text',
        },
      ],
      role: 'user',
    },
  ])
})

test('getStoredMessages preserves stored assistant function calls and tool outputs in request order', async () => {
  ChatStorageWorker.registerMockRpc({
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        message: {
          role: 'user',
          text: 'what is in notes.txt',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:00.000Z',
        type: 'chat-message-added',
      },
      {
        message: {
          content: [
            {
              text: 'Let me check.',
              type: 'text',
            },
            {
              arguments: '{"uri":"file:///workspace/notes.txt"}',
              call_id: 'call_1',
              name: 'read_file',
              type: 'function_call',
            },
          ],
          role: 'assistant',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:01.000Z',
        type: 'chat-message-added',
      },
      {
        sessionId,
        timestamp: '2026-05-13T00:00:02.000Z',
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
        type: 'tool-calls-finished',
      },
      {
        message: {
          role: 'assistant',
          text: 'The file contains three lines.',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:03.000Z',
        type: 'chat-message-added',
      },
    ],
  })

  const messages = await getStoredMessages('session-1', 'fallback')

  expect(messages).toEqual([
    {
      content: [
        {
          text: 'what is in notes.txt',
          type: 'input_text',
        },
      ],
      role: 'user',
    },
    {
      content: [
        {
          text: 'Let me check.',
          type: 'input_text',
        },
      ],
      role: 'assistant',
    },
    {
      arguments: '{"uri":"file:///workspace/notes.txt"}',
      call_id: 'call_1',
      name: 'read_file',
      type: 'function_call',
    },
    {
      call_id: 'call_1',
      output: '{"content":"alpha\\nbeta\\ngamma","uri":"file:///workspace/notes.txt"}',
      type: 'function_call_output',
    },
    {
      content: [
        {
          text: 'The file contains three lines.',
          type: 'input_text',
        },
      ],
      role: 'assistant',
    },
  ])
})

test('getStoredMessages preserves multiple tool-call rounds in exact alternating order', async () => {
  ChatStorageWorker.registerMockRpc({
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        message: {
          role: 'user',
          text: 'inspect two files',
        },
        sessionId,
        timestamp: '2026-05-13T00:00:00.000Z',
        type: 'chat-message-added',
      },
      {
        requestId: 'request-1',
        sessionId,
        timestamp: '2026-05-13T00:00:01.000Z',
        toolCalls: [
          {
            args: { uri: 'file:///workspace/one.txt' },
            id: 'call_1',
            name: 'read_file',
          },
        ],
        turnId: 'turn-1',
        type: 'ai-response',
      },
      {
        sessionId,
        timestamp: '2026-05-13T00:00:02.000Z',
        toolCallResults: [
          {
            callId: 'call_1',
            type: 'success',
            value: {
              content: 'first file',
              uri: 'file:///workspace/one.txt',
            },
          },
        ],
        type: 'tool-calls-finished',
      },
      {
        requestId: 'request-2',
        sessionId,
        timestamp: '2026-05-13T00:00:03.000Z',
        toolCalls: [
          {
            args: { uri: 'file:///workspace/two.txt' },
            id: 'call_2',
            name: 'read_file',
          },
        ],
        turnId: 'turn-1',
        type: 'ai-response',
      },
      {
        sessionId,
        timestamp: '2026-05-13T00:00:04.000Z',
        toolCallResults: [
          {
            callId: 'call_2',
            type: 'success',
            value: {
              content: 'second file',
              uri: 'file:///workspace/two.txt',
            },
          },
        ],
        type: 'tool-calls-finished',
      },
    ],
  })

  const messages = await getStoredMessages('session-1', 'fallback')

  expect(messages).toEqual([
    {
      content: [
        {
          text: 'inspect two files',
          type: 'input_text',
        },
      ],
      role: 'user',
    },
    {
      arguments: '{"uri":"file:///workspace/one.txt"}',
      call_id: 'call_1',
      name: 'read_file',
      type: 'function_call',
    },
    {
      call_id: 'call_1',
      output: '{"content":"first file","uri":"file:///workspace/one.txt"}',
      type: 'function_call_output',
    },
    {
      arguments: '{"uri":"file:///workspace/two.txt"}',
      call_id: 'call_2',
      name: 'read_file',
      type: 'function_call',
    },
    {
      call_id: 'call_2',
      output: '{"content":"second file","uri":"file:///workspace/two.txt"}',
      type: 'function_call_output',
    },
  ])
})
