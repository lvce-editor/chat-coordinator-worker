export interface AiProvider {
  readonly makeRequest: () => Promise<void>
  readonly url: string
}
