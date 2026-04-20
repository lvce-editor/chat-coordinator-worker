import { expect, test } from '@jest/globals'
import { ChatMathWorker, ChatMessageParsingWorker, ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { getChatViewModel } from '../src/parts/GetChatViewModel/GetChatViewModel.ts'

test('getChatViewModel should build display items from storage events and render math through chat math worker', async () => {
  const storageRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.getEvents': async (sessionId: string) => {
      expect(sessionId).toBe('session-1')
      return [
        {
          message: {
            attachments: [
              {
                attachmentId: 'attachment-image',
                displayType: 'image',
                mimeType: 'image/png',
                name: 'chart.png',
                previewSrc: 'data:image/png;base64,abc',
                size: 1,
              },
              {
                attachmentId: 'attachment-text',
                displayType: 'text-file',
                mimeType: 'text/plain',
                name: 'notes.txt',
                size: 2,
                textContent: 'hello',
              },
            ],
            id: 'message-1',
            role: 'user',
            text: 'Hello $x$',
            time: '10:00',
          },
          sessionId: 'session-1',
          timestamp: '2026-04-20T10:00:00.000Z',
          type: 'chat-message-added',
        },
        {
          requestId: 'assistant-1',
          sessionId: 'session-1',
          timestamp: '2026-04-20T10:00:01.000Z',
          toolCalls: [
            {
              arguments: '{}',
              id: 'call-1',
              name: 'getWorkspaceUri',
              status: 'success',
            },
          ],
          type: 'ai-response-success',
          value: {
            id: 'resp_1',
            output: [
              {
                content: [
                  {
                    text: 'Done',
                    type: 'output_text',
                  },
                ],
                type: 'message',
              },
            ],
            status: 'completed',
          },
        },
      ]
    },
  })
  const parsingRpc = ChatMessageParsingWorker.registerMockRpc({
    'ChatMessageParsing.parseMessageContents': async (rawMessages: readonly string[]) => {
      expect(rawMessages).toEqual(['Hello $x$', 'Done'])
      return [
        [
          {
            children: [
              {
                text: 'Hello ',
                type: 'text',
              },
              {
                displayMode: false,
                text: 'x',
                type: 'math-inline',
              },
            ],
            type: 'text',
          },
        ],
        [
          {
            children: [
              {
                text: 'Done',
                type: 'text',
              },
            ],
            type: 'text',
          },
        ],
      ]
    },
  })
  const mathRpc = ChatMathWorker.registerMockRpc({
    'ChatMath.getMathInlineDom': async (_node: unknown) => [
      {
        childCount: 1,
        className: 'MathInline',
        type: 4,
      },
      {
        text: 'x',
        type: 12,
      },
    ],
  })

  const result = await getChatViewModel({ sessionId: 'session-1', useChatMathWorker: true })

  expect(storageRpc.invocations).toEqual([['ChatStorage.getEvents', 'session-1']])
  expect(parsingRpc.invocations).toEqual([['ChatMessageParsing.parseMessageContents', ['Hello $x$', 'Done']]])
  expect(mathRpc.invocations).toEqual([
    [
      'ChatMath.getMathInlineDom',
      {
        displayMode: false,
        text: 'x',
        type: 'math-inline',
      },
    ],
  ])
  expect(result).toEqual({
    items: [
      {
        message: {
          attachments: [
            {
              attachmentId: 'attachment-text',
              displayType: 'text-file',
              mimeType: 'text/plain',
              name: 'notes.txt',
              size: 2,
              textContent: 'hello',
            },
          ],
          id: 'message-1',
          role: 'user',
          text: 'Hello $x$',
          time: '10:00',
        },
        parsedContent: [
          {
            children: [
              {
                text: 'Hello ',
                type: 'text',
              },
              {
                dom: [
                  {
                    childCount: 1,
                    className: 'MathInline',
                    type: 4,
                  },
                  {
                    text: 'x',
                    type: 12,
                  },
                ],
                type: 'math-inline-dom',
              },
            ],
            type: 'text',
          },
        ],
      },
      {
        message: {
          attachments: [
            {
              attachmentId: 'attachment-image',
              displayType: 'image',
              mimeType: 'image/png',
              name: 'chart.png',
              previewSrc: 'data:image/png;base64,abc',
              size: 1,
            },
          ],
          id: 'message-1',
          role: 'user',
          text: '',
          time: '10:00',
        },
        parsedContent: [
          {
            children: [
              {
                text: '',
                type: 'text',
              },
            ],
            type: 'text',
          },
        ],
        standaloneImageAttachment: {
          attachmentId: 'attachment-image',
          displayType: 'image',
          mimeType: 'image/png',
          name: 'chart.png',
          previewSrc: 'data:image/png;base64,abc',
          size: 1,
        },
      },
      {
        message: {
          id: 'assistant-1',
          role: 'assistant',
          text: '',
          time: '2026-04-20T10:00:01.000Z',
          toolCalls: [
            {
              arguments: '{}',
              id: 'call-1',
              name: 'getWorkspaceUri',
              status: 'success',
            },
          ],
        },
        parsedContent: [
          {
            children: [
              {
                text: '',
                type: 'text',
              },
            ],
            type: 'text',
          },
        ],
      },
      {
        message: {
          id: 'assistant-1',
          role: 'assistant',
          text: 'Done',
          time: '2026-04-20T10:00:01.000Z',
        },
        parsedContent: [
          {
            children: [
              {
                text: 'Done',
                type: 'text',
              },
            ],
            type: 'text',
          },
        ],
      },
    ],
    sessionId: 'session-1',
  })
})