import type { AiLoopResult } from '../AiLoopResult/AiLoopResult.ts'
import { makeAiRequest } from '../MakeAiRequest/MakeAiRequest.ts'

export interface LoopOptions {
  readonly modelId: string
  readonly providerId: string
  readonly systemPrompt: string
  readonly url: string
}

export const aiLoop = async (loopOptions: LoopOptions): Promise<AiLoopResult> => {
  const { systemPrompt, url } = loopOptions
  // TODO
  const toolCalls = []

  do {
    const result = await makeAiRequest({
      systemPrompt,
      url,
    })
    if (result.type === 'error') {
      return {
        error: result.error,
        type: 'error',
      }
    }
    if (result.toolCalls.length === 0) {
      return {
        type: 'success',
      }
    }
  } while (toolCalls.length > 0)
}
