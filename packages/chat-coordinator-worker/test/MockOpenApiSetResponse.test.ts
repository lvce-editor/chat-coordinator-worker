import { expect, test } from '@jest/globals'
import { mockOpenApiSetResponse } from '../src/parts/MockOpenApiSetResponse/MockOpenApiSetResponse.ts'
import * as MockOpenApiStream from '../src/parts/MockOpenApiStream/MockOpenApiStream.ts'

test('mockOpenApiSetResponse queues multiple responses in order', async () => {
  const firstResponse = {
    toolCall: {
      arguments: {
        uri: 'file:///workspace/generated-folder',
      },
      name: 'create_directory',
    },
  }
  const secondResponse = {
    text: 'Created generated-folder.',
  }

  mockOpenApiSetResponse([firstResponse, secondResponse])

  expect(await MockOpenApiStream.consumeResponseText()).toBe(JSON.stringify(firstResponse))
  expect(await MockOpenApiStream.consumeResponseText()).toBe(JSON.stringify(secondResponse))
})

test('mockOpenApiSetResponse resets queued responses when setting a new single response', async () => {
  mockOpenApiSetResponse([
    {
      text: 'stale response',
    },
    {
      text: 'staler response',
    },
  ])

  const replacementResponse = {
    text: 'replacement response',
  }

  mockOpenApiSetResponse(replacementResponse)

  expect(await MockOpenApiStream.consumeResponseText()).toBe(JSON.stringify(replacementResponse))
})
