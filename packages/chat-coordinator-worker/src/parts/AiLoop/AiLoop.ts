export interface LoopOptions {
  readonly systemPrompt: string
}

export const aiLoop = async (loopOptions: LoopOptions): Promise<void> => {
  // TODO
  const toolCalls = []

  do {
    // TODO 1. make ai request
    // check if there are tool calls
    // const response
  } while (toolCalls.length > 0)
}
