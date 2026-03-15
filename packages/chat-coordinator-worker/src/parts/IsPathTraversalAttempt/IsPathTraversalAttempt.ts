export const isPathTraversalAttempt = (path: string): boolean => {
  if (!path) {
    return false
  }
  if (path.startsWith('/') || path.startsWith('\\')) {
    return true
  }
  if (path.startsWith('file://')) {
    return true
  }
  if (/^[a-zA-Z]:[\\/]/.test(path)) {
    return true
  }
  const segments = path.split(/[\\/]/)
  return segments.includes('..')
}
