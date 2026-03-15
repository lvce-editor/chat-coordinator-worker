import type { ChatState } from '../ChatState/ChatState.ts'

export const focusInput = (state: ChatState): ChatState => {
  return {
    ...state,
    focus: 'composer',
    focused: true,
  }
}
