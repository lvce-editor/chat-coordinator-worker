/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { expect, test } from '@jest/globals'
import { RendererWorker } from '@lvce-editor/rpc-registry'
import { executeChatTool, getBasicChatTools } from '../src/parts/ChatTools/ChatTools.ts'

const options = {
  assetDir: '/test-asset-dir',
  platform: 0,
}

test('getBasicChatTools should return read, write, list and workspace uri tool definitions', () => {
  const tools = getBasicChatTools()

  const names = tools.map((tool) => tool.function.name)

  expect(names).toEqual(['read_file', 'write_file', 'list_files', 'getWorkspaceUri', 'render_html'])
})

test('executeChatTool should execute read_file tool', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'FileSystem.readFile': async () => 'hello world',
  })

  const uri = 'file:///workspace/src/main.ts'
  const result = await executeChatTool('read_file', JSON.stringify({ uri }), options)

  expect(mockRendererRpc.invocations).toEqual([['FileSystem.readFile', uri]])
  expect(JSON.parse(result)).toEqual({
    content: 'hello world',
    uri,
  })
})

test('executeChatTool should execute write_file tool', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'FileSystem.writeFile': async () => undefined,
  })

  const result = await executeChatTool('write_file', JSON.stringify({ content: 'new content', path: 'src/main.ts' }), options)

  expect(mockRendererRpc.invocations).toEqual([['FileSystem.writeFile', 'src/main.ts', 'new content']])
  expect(JSON.parse(result)).toEqual({
    ok: true,
    path: 'src/main.ts',
  })
})

test('executeChatTool should execute list_files tool', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'FileSystem.readDirWithFileTypes': async () => [
      [1, 'src'],
      [2, 'README.md'],
    ],
  })

  const uri = 'file:///workspace'
  const result = await executeChatTool('list_files', JSON.stringify({ uri }), options)

  expect(mockRendererRpc.invocations).toEqual([['FileSystem.readDirWithFileTypes', uri]])
  expect(JSON.parse(result)).toEqual({
    entries: [
      [1, 'src'],
      [2, 'README.md'],
    ],
    uri,
  })
})

test('executeChatTool should execute getWorkspaceUri tool', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'Workspace.getPath': async () => '/workspace/project',
  })

  const result = await executeChatTool('getWorkspaceUri', JSON.stringify({}), options)

  expect(mockRendererRpc.invocations).toEqual([['Workspace.getPath']])
  expect(JSON.parse(result)).toEqual({
    workspaceUri: '/workspace/project',
  })
})

test('executeChatTool should execute render_html tool', async () => {
  const result = await executeChatTool(
    'render_html',
    JSON.stringify({
      css: '.card { color: blue; }',
      html: '<div class="card">weather</div>',
      title: 'Weather Card',
    }),
    options,
  )

  expect(JSON.parse(result)).toEqual({
    css: '.card { color: blue; }',
    html: '<div class="card">weather</div>',
    ok: true,
    title: 'Weather Card',
  })
})

test('executeChatTool should reject path traversal attempts', async () => {
  const result = await executeChatTool('read_file', JSON.stringify({ path: '../secret.txt' }), options)

  expect(JSON.parse(result)).toEqual({
    error: 'Access denied: path must be relative and stay within the open workspace folder.',
  })
})

test('executeChatTool should return unknown tool error', async () => {
  const result = await executeChatTool('unknown_tool', '{}', options)

  expect(JSON.parse(result)).toEqual({
    error: 'Unknown tool: unknown_tool',
  })
})

test('executeChatTool should include error stack when tool execution throws', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'FileSystem.readFile': async () => {
      const error = new TypeError("Cannot read properties of undefined (reading 'invoke')")
      error.stack = "TypeError: Cannot read properties of undefined (reading 'invoke')\n    at test:1:1"
      throw error
    },
  })

  const uri = 'file:///workspace/src/main.ts'
  const result = await executeChatTool('read_file', JSON.stringify({ uri }), options)

  expect(mockRendererRpc.invocations).toEqual([['FileSystem.readFile', uri]])
  expect(JSON.parse(result)).toEqual({
    error: "TypeError: Cannot read properties of undefined (reading 'invoke')",
    errorStack: "TypeError: Cannot read properties of undefined (reading 'invoke')\n    at test:1:1",
    stack: "TypeError: Cannot read properties of undefined (reading 'invoke')\n    at test:1:1",
    uri,
  })
})
