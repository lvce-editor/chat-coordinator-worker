export const sanitizeGeneratedTitle = (value: string): string => {
  return value
    .replace(/^title:\s*/i, '')
    .replaceAll(/^['"`\s]+|['"`\s]+$/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}
