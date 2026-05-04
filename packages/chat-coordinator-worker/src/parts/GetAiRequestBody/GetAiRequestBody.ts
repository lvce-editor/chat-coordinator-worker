export interface AiRequestInput {
  readonly content: string
  readonly role: 'assistant' | 'system' | 'user'
}

const isAiRequestInput = (value: unknown): value is AiRequestInput => {
  return !!value && typeof value === 'object' && 'content' in value && 'role' in value
}

export const getAiRequestBody = (
  systemPrompt: string,
  text: string | readonly string[] | readonly AiRequestInput[],
): Readonly<{ input: readonly AiRequestInput[] }> => {
  const messages =
    typeof text === 'string'
      ? [
          {
            content: text,
            role: 'user' as const,
          },
        ]
      : text.map((message) =>
          isAiRequestInput(message)
            ? message
            : {
                content: message,
                role: 'user' as const,
              },
        )
  return {
    input: [
      {
        content: systemPrompt,
        role: 'system',
      },
      ...messages,
    ],
  }
}
