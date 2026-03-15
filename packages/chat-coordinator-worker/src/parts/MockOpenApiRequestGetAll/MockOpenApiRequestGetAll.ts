import type { ChatState } from '../ChatState/ChatState.ts'
import type { MockOpenApiRequest } from '../MockOpenApiRequest/MockOpenApiRequest.ts'
import * as MockOpenApiRequestState from '../MockOpenApiRequest/MockOpenApiRequest.ts'

export const mockOpenApiRequestGetAll = (_state: ChatState): readonly MockOpenApiRequest[] => {
  return MockOpenApiRequestState.getAll()
}
