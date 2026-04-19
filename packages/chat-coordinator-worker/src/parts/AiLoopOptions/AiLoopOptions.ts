export interface AiLoopOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly modelId: string
  readonly providerId: string
  readonly systemPrompt: string
  readonly url: string
}
