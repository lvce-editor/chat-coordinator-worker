import * as MockOpenApiStream from '../MockOpenApiStream/MockOpenApiStream.ts'

export const mockOpenApiSetResponse = (body: unknown): void => {
  const responses = Array.isArray(body) ? body : [body]
  if (responses.length === 1) {
    const serialized = typeof responses[0] === 'string' ? responses[0] : JSON.stringify(responses[0]) || 'null'
    MockOpenApiStream.reset()
    MockOpenApiStream.pushChunk(serialized)
    MockOpenApiStream.finish()
    return
  }
  MockOpenApiStream.reset()
  for (let index = 0; index < responses.length; index += 1) {
    const response = responses[index]
    const requestId = `mock-response-${index + 1}`
    const serialized = typeof response === 'string' ? response : JSON.stringify(response) || 'null'
    MockOpenApiStream.reset(requestId)
    MockOpenApiStream.pushChunk(serialized, requestId)
    MockOpenApiStream.finish(requestId)
  }
}
