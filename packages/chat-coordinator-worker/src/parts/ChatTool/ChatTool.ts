export interface ChatTool {
  readonly function: {
    readonly name: string
    readonly description: string
    readonly parameters: {
      readonly additionalProperties: boolean
      readonly properties: Readonly<Record<string, unknown>>
      readonly required?: readonly string[]
      readonly type: 'object'
    }
  }
  readonly type: 'function'
}
