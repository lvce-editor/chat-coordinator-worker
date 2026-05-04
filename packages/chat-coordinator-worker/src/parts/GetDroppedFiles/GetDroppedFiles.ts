import { RendererWorker } from '@lvce-editor/rpc-registry'

interface FileHandleTransportItem {
  readonly value: FileSystemHandle
}

export const getDroppedFiles = async (fileHandles: readonly number[]): Promise<readonly FileSystemFileHandle[]> => {
  // TODO adjust e2e test and remove this code
  if (fileHandles.some((item: any): boolean => typeof item !== 'number')) {
    return fileHandles.map((item: any): any => {
      return {
        getFile(): any {
          return item
        },
      }
    })
  }
  const actualHandles = await RendererWorker.getFileHandles(fileHandles)
  return actualHandles
    .map((item): any => (item as unknown as FileHandleTransportItem).value)
    .filter((item): item is FileSystemFileHandle => item.kind === 'file')
}
