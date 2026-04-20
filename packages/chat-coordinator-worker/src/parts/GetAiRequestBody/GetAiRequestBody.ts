export interface AiRequestInput {
  readonly content: string
  readonly role: 'system' | 'user'
}

export const getAiRequestBody = (systemPrompt: string, text: string | readonly string[]): Readonly<{ input: readonly AiRequestInput[] }> => {
  const userMessages = typeof text === 'string' ? [text] : text
  return {
    input: [
      {
        content: systemPrompt,
        role: 'system',
      },
      ...userMessages.map((message) => ({
        content: message,
        role: 'user' as const,
      })),
    ],
  }
}
