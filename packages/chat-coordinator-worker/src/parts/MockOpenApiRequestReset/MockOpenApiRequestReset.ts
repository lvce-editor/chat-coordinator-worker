import type { ChatState } from '../ChatState/ChatState.ts'
import * as MockOpenApiRequest from '../MockOpenApiRequest/MockOpenApiRequest.ts'

export const mockOpenApiRequestReset = (state: ChatState): ChatState => {
  MockOpenApiRequest.reset()
  return state
}
