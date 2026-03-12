import { cp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { root } from './root.ts'

const sharedProcessPath = join(root, 'packages', 'server', 'node_modules', '@lvce-editor', 'shared-process', 'index.js')

const sharedProcessUrl = pathToFileURL(sharedProcessPath).toString()

const sharedProcess = await import(sharedProcessUrl)

process.env.PATH_PREFIX = '/chat-coordinator-worker'
const { commitHash } = await sharedProcess.exportStatic({
  root,
  extensionPath: '',
  testPath: 'packages/e2e',
})

const rendererWorkerPath = join(root, 'dist', commitHash, 'packages', 'renderer-worker', 'dist', 'rendererWorkerMain.js')

export const getRemoteUrl = (path: string): string => {
  const url = pathToFileURL(path).toString().slice(8)
  return `/remote/${url}`
}

const content = await readFile(rendererWorkerPath, 'utf8')
const chatCoordinatorWorkerPath = join(root, '.tmp/dist-chat-coordinator-worker/dist/chatCoordinatorWorkerMain.js')

const replaceRemoteUrlWithAssetUrl = (
  currentContent: string,
  variableName: string,
  packageName: string,
  workerMainName: string,
  localPath: string,
) => {
  // @ts-ignore
  const remoteUrl = getRemoteUrl(localPath)
  const occurrence = `// const ${variableName} = \`\${assetDir}/packages/${packageName}/dist/${workerMainName}\`
const ${variableName} = \`${remoteUrl}\``
  const replacement = `const ${variableName} = \`\${assetDir}/packages/${packageName}/dist/${workerMainName}\``
  if (!currentContent.includes(occurrence)) {
    return currentContent
  }
  return currentContent.replace(occurrence, replacement)
}

let newContent = content
newContent = replaceRemoteUrlWithAssetUrl(
  newContent,
  'chatCoordinatorWorkerUrl',
  'chat-coordinator-worker',
  'chatCoordinatorWorkerMain.js',
  chatCoordinatorWorkerPath,
)

// if (newContent === content) {
//   throw new Error('occurrence not found')
// }
await writeFile(rendererWorkerPath, newContent)

await cp(join(root, 'dist'), join(root, '.tmp', 'static'), { recursive: true })
