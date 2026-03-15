import type { ChatState } from '../ChatState/ChatState.ts'
import * as MockOpenApiStream from '../MockOpenApiStream/MockOpenApiStream.ts'

export const mockOpenApiSetHttpErrorResponse = (state: ChatState, statusCode: number, body: unknown): ChatState => {
  MockOpenApiStream.setHttpErrorResponse(statusCode, body)
  return state
}
