import * as MockBackendCompletion from '../MockBackendCompletion/MockBackendCompletion.ts'

export const mockBackendSetResponse = (body: unknown): void => {
  MockBackendCompletion.setResponse(body)
}
