import * as MockOpenApiStream from '../MockOpenApiStream/MockOpenApiStream.ts'

export const mockOpenApiSetResponse = (body: unknown): void => {
  const serialized = typeof body === 'string' ? body : JSON.stringify(body) || 'null'
  MockOpenApiStream.reset()
  MockOpenApiStream.pushChunk(serialized)
  MockOpenApiStream.finish()
}
