interface AiRequestOptions {
  readonly url: string
}

export const makeAiRequest = async (systemPrompt: string): Promise<void> => {
  const response = await fetch(url)
}
