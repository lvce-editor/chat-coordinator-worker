export const normalizeRelativePath = (path: string): string => {
  const segments = path.split(/[\\/]/).filter((segment) => segment && segment !== '.')
  if (segments.length === 0) {
    return '.'
  }
  return segments.join('/')
}
