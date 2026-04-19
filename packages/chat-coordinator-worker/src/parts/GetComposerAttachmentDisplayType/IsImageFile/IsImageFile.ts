export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/')
}
