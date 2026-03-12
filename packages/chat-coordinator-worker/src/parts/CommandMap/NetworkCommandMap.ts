import { makeApiRequest } from '../MakeApiRequest/MakeApiRequest.ts'
import { makeStreamingApiRequest } from '../MakeStreamingApiRequest/MakeStreamingApiRequest.ts'

export const networkCommandMap = {
  'chatCoordinator.makeApiRequest': makeApiRequest,
  'chatCoordinator.makeStreamingApiRequest': makeStreamingApiRequest,
}
