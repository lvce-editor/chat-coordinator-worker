import * as MockOpenApiStream from '../MockOpenApiStream/MockOpenApiStream.ts'

export interface MockResponse {
  readonly text: string
}

export const registerMockResponse = (mockResponse: MockResponse): void => {
  MockOpenApiStream.reset()
  MockOpenApiStream.pushChunk(mockResponse.text)
  MockOpenApiStream.finish()
}
