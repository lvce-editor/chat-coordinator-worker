export interface SubmitOptions {
  readonly attachments: readonly any[]
  readonly id: string
  readonly modelId: string
  readonly openAiKey: string
  readonly role: 'user' | 'assistant'
  readonly sessionId: string
  readonly systemPrompt: string
  readonly text: string
}
