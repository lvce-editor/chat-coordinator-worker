export interface AiLoopOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly modelId: string
  readonly providerId: string
  readonly sessionId: string
  readonly systemPrompt: string
  readonly text: string
  readonly turnId: string
  readonly url: string
}
