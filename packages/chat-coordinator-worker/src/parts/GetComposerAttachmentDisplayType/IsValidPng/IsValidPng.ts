const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

export const isValidPng = async (blob: Blob): Promise<boolean> => {
  const header = new Uint8Array(await blob.slice(0, pngSignature.length).arrayBuffer())
  if (header.length !== pngSignature.length) {
    return false
  }
  return pngSignature.every((value, index) => header[index] === value)
}
