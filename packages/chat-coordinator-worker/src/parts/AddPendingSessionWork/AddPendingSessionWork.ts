import type { AiLoopOptions } from '../AiLoopOptions/AiLoopOptions.ts'
import { enqueueSessionId } from '../EnqueueSessionId/EnqueueSessionId.ts'
import { appendMissingAiRequestInputTail } from '../MergeAiRequestInputs/MergeAiRequestInputs.ts'
import { pendingSessionWorkBySessionId, type PendingSessionWork } from '../ProcessQueueState/ProcessQueueState.ts'

export const addPendingSessionWork = (options: AiLoopOptions): void => {
  const existingPendingSessionWork = pendingSessionWorkBySessionId.get(options.sessionId)
  if (existingPendingSessionWork) {
    existingPendingSessionWork.options = {
      ...options,
      text: appendMissingAiRequestInputTail(existingPendingSessionWork.options.text, options.text),
    }
    existingPendingSessionWork.pendingVersion += 1
    enqueueSessionId(options.sessionId, existingPendingSessionWork)
    return
  }
  const pendingSessionWork: PendingSessionWork = {
    options,
    pendingVersion: 1,
    processedVersion: 0,
    queued: false,
    waiters: [],
  }
  pendingSessionWorkBySessionId.set(options.sessionId, pendingSessionWork)
  enqueueSessionId(options.sessionId, pendingSessionWork)
}
