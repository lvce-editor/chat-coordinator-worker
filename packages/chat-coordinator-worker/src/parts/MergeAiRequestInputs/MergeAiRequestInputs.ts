import type { AiRequestInput } from '../GetAiRequestBody/GetAiRequestBody.ts'

const getComparableInput = (input: AiRequestInput): string => {
  return JSON.stringify(input)
}

const getAiRequestInputs = (value: string | readonly AiRequestInput[]): readonly AiRequestInput[] => {
  if (typeof value !== 'string') {
    return value
  }
  return [
    {
      content: value,
      role: 'user',
    },
  ]
}

const getFirstMissingIndex = (baseInputs: readonly AiRequestInput[], fallbackInputs: readonly AiRequestInput[]): number => {
  let baseIndex = 0
  for (let fallbackIndex = 0; fallbackIndex < fallbackInputs.length; fallbackIndex += 1) {
    const comparableFallback = getComparableInput(fallbackInputs[fallbackIndex])
    while (baseIndex < baseInputs.length && getComparableInput(baseInputs[baseIndex]) !== comparableFallback) {
      baseIndex += 1
    }
    if (baseIndex === baseInputs.length) {
      return fallbackIndex
    }
    baseIndex += 1
  }
  return fallbackInputs.length
}

export const appendMissingAiRequestInputTail = (
  baseValue: string | readonly AiRequestInput[],
  fallbackValue: string | readonly AiRequestInput[],
): readonly AiRequestInput[] => {
  const baseInputs = getAiRequestInputs(baseValue)
  const fallbackInputs = getAiRequestInputs(fallbackValue)
  const firstMissingIndex = getFirstMissingIndex(baseInputs, fallbackInputs)
  return [...baseInputs, ...fallbackInputs.slice(firstMissingIndex)]
}
