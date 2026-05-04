export const isValidJpeg = async (blob: Blob): Promise<boolean> => {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
}
