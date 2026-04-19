export interface AiLoopOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly modelId: string
  readonly providerId: string
  readonly requestId: string
  readonly sessionId: string
  readonly systemPrompt: string
  readonly url: string
}
