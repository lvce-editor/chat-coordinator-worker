export const getNumber = (value: unknown, fallback = 0): number => {
  return typeof value === 'number' ? value : fallback
}
