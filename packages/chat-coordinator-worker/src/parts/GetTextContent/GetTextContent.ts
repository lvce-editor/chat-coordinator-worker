export const getTextContent = (content: unknown): string => {
  if (typeof content === 'string') {
    return content
  }
  if (!Array.isArray(content)) {
    return ''
  }
  const textParts: string[] = []
  for (const part of content) {
    if (!part || typeof part !== 'object') {
      continue
    }
    const maybeType = Reflect.get(part, 'type')
    const maybeText = Reflect.get(part, 'text')
    if (maybeType === 'text' && typeof maybeText === 'string') {
      textParts.push(maybeText)
    }
  }
  return textParts.join('\n')
}
