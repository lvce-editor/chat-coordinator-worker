const textFileRegex = /\.txt$/i

export const isTextFile = (name: string, mimeType: string): boolean => {
  return mimeType === 'text/plain' || textFileRegex.test(name)
}
