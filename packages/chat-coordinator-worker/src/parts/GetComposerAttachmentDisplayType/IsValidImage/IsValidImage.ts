import { isValidJpeg } from '../IsValidJpeg/IsValidJpeg.ts'
import { isValidPng } from '../IsValidPng/IsValidPng.ts'

export const isValidImage = async (blob: Blob, mimeType: string): Promise<boolean> => {
  if (mimeType.startsWith('image/') && mimeType !== 'image/png' && mimeType !== 'image/jpeg') {
    return true
  }
  switch (mimeType) {
    case 'image/jpeg':
      return isValidJpeg(blob)
    case 'image/png':
      return isValidPng(blob)
    default:
      break
  }
  if (typeof createImageBitmap !== 'function') {
    return true
  }
  try {
    const imageBitmap = await createImageBitmap(blob)
    imageBitmap.close()
    return true
  } catch {
    return false
  }
}
