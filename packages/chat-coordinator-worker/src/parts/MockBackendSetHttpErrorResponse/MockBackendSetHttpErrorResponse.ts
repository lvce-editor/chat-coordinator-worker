import * as MockBackendCompletion from '../MockBackendCompletion/MockBackendCompletion.ts'

export const mockBackendSetHttpErrorResponse = (statusCode: number, body: unknown): void => {
  MockBackendCompletion.setHttpErrorResponse(statusCode, body)
}
