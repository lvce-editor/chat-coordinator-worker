import type { ChatState } from '../ChatState/ChatState.ts'
import { measureTextBlockHeight } from '../MeasureTextBlockHeight/MeasureTextBlockHeight.ts'

const getComposerWidth = (width: number): number => {
  return Math.max(1, width - 32)
}

const getMinComposerHeight = (lineHeight: number): number => {
  return lineHeight + 8
}

const getMaxComposerHeight = (lineHeight: number, maxComposerRows: number): number => {
  return lineHeight * Math.max(1, maxComposerRows) + 8
}

const estimateComposerHeight = (value: string, lineHeight: number): number => {
  const lineCount = value.split('\n').length
  return lineCount * lineHeight + 8
}

export const getComposerHeight = async (state: ChatState, value: string, width = state.width): Promise<number> => {
  const { composerFontFamily, composerFontSize, composerLineHeight, maxComposerRows } = state
  if (value === '') {
    return composerLineHeight
  }
  const minimumHeight = getMinComposerHeight(composerLineHeight)
  const maximumHeight = getMaxComposerHeight(composerLineHeight, maxComposerRows)
  const content = value || ' '
  const composerWidth = getComposerWidth(width)
  try {
    const measuredHeight = await measureTextBlockHeight(content, composerFontFamily, composerFontSize, `${composerLineHeight}px`, composerWidth)
    const height = Math.ceil(measuredHeight) + 8
    return Math.max(minimumHeight, Math.min(maximumHeight, height))
  } catch {
    return Math.max(minimumHeight, Math.min(maximumHeight, estimateComposerHeight(value, composerLineHeight)))
  }
}

export const getMinComposerHeightForState = (state: ChatState): number => {
  return getMinComposerHeight(state.composerLineHeight)
}
