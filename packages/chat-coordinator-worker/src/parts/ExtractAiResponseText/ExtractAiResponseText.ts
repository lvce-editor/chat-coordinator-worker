interface ResponseContentPart {
  readonly text?: string
  readonly type?: string
}

interface ResponseOutputItem {
  readonly content?: readonly ResponseContentPart[]
}

interface ResponseWithOutputText {
  readonly output?: readonly ResponseOutputItem[]
  readonly output_text?: string | readonly string[]
}

const getOutputText = (outputText: string | readonly string[] | undefined): string | undefined => {
  if (typeof outputText === 'string') {
    return outputText || undefined
  }
  if (Array.isArray(outputText)) {
    const joinedOutputText = outputText.filter((part): part is string => typeof part === 'string').join('')
    return joinedOutputText || undefined
  }
  return undefined
}

const getOutputItemText = (item: ResponseOutputItem): string => {
  const { content = [] } = item
  return content
    .filter((part): part is ResponseContentPart & { readonly text: string } => typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
}

export const extractAiResponseText = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') {
    return undefined
  }
  const response = data as ResponseWithOutputText
  const outputText = getOutputText(response.output_text)
  if (outputText) {
    return outputText
  }
  if (!Array.isArray(response.output)) {
    return undefined
  }
  const text = response.output.map(getOutputItemText).join('')
  return text || undefined
}
