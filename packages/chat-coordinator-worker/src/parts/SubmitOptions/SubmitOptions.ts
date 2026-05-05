export interface SubmitOptions {
  readonly attachments: readonly any[]
  readonly authAccessToken?: string
  readonly backendUrl?: string
  readonly id: string
  readonly modelId: string
  readonly openAiKey: string
  readonly requestId: string
  readonly role: 'user' | 'assistant'
  readonly sessionId: string
  readonly systemPrompt: string
  readonly text: string
  readonly useOwnBackend?: boolean
}
