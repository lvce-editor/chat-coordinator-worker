import type { ChatState } from '../ChatState/ChatState.ts'
import * as MockOpenApiStream from '../MockOpenApiStream/MockOpenApiStream.ts'

export const mockOpenApiStreamPushChunk = (state: ChatState, chunk: string): ChatState => {
  MockOpenApiStream.pushChunk(chunk)
  return state
}
