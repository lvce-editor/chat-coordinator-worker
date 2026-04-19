export interface AiRequestInput {
  readonly content: string
  readonly role: 'system' | 'user'
}

export const getAiRequestBody = (systemPrompt: string, text: string): Readonly<{ input: readonly AiRequestInput[] }> => {
  return {
    input: [
      {
        content: systemPrompt,
        role: 'system',
      },
      {
        content: text,
        role: 'user',
      },
    ],
  }
}
