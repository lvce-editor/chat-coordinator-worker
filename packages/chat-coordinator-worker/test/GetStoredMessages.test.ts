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
