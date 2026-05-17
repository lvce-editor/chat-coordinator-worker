import { join } from 'node:path'
import { root } from './root.ts'

export const threshold = 450_000

export const instantiations = 300_000

export const instantiationsPath = join(root, 'packages', 'chat-coordinator-worker')

export const workerPath = join(root, '.tmp/dist-chat-coordinator-worker/dist/chatCoordinatorWorkerMain.js')

export const playwrightPath = new URL('../../e2e/node_modules/playwright/index.mjs', import.meta.url).toString()
