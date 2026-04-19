export const getString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback
}
