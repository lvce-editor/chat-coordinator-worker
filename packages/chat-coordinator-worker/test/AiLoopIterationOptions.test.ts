import { expect, test } from '@jest/globals'
import type { AiLoopIterationOptions } from '../src/parts/AiLoopIterationOptions/AiLoopIterationOptions.ts'

test('AiLoopIterationOptions type is importable', () => {
  const options: AiLoopIterationOptions = {
    headers: {},
    modelId: 'gpt-5-mini',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    toolCalls: [],
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  }

  expect(options).toEqual({
    headers: {},
    modelId: 'gpt-5-mini',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    toolCalls: [],
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })
})
