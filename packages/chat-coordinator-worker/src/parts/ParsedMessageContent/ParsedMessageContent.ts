import type { ChatMessage } from '../ChatMessage/ChatMessage.ts'
import type { ParsedMessage } from '../ParsedMessage/ParsedMessage.ts'
import type { MessageIntermediateNode } from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'
import { parseMessageContent } from '../ParseMessageContent/ParseMessageContent.ts'

const emptyMessageContent: readonly MessageIntermediateNode[] = [
  {
    children: [
      {
        text: '',
        type: 'text',
      },
    ],
    type: 'text',
  },
]

export const getParsedMessageContent = (
  parsedMessages: readonly ParsedMessage[],
  messageId: string,
): readonly MessageIntermediateNode[] | undefined => {
  const parsedMessage = parsedMessages.find((item) => item.id === messageId)
  return parsedMessage?.parsedContent
}

export const setParsedMessageContent = (
  parsedMessages: readonly ParsedMessage[],
  messageId: string,
  text: string,
  parsedContent: readonly MessageIntermediateNode[],
): readonly ParsedMessage[] => {
  const index = parsedMessages.findIndex((item) => item.id === messageId)
  if (index === -1) {
    return [...parsedMessages, { id: messageId, parsedContent, text }]
  }
  const existingItem = parsedMessages[index]
  if (existingItem.text === text && existingItem.parsedContent === parsedContent) {
    return parsedMessages
  }
  return [...parsedMessages.slice(0, index), { ...existingItem, parsedContent, text }, ...parsedMessages.slice(index + 1)]
}

export const copyParsedMessageContent = (
  parsedMessages: readonly ParsedMessage[],
  sourceMessageId: string,
  targetMessageId: string,
): readonly ParsedMessage[] => {
  const parsedMessage = parsedMessages.find((item) => item.id === sourceMessageId)
  if (!parsedMessage) {
    return parsedMessages
  }
  return setParsedMessageContent(parsedMessages, targetMessageId, parsedMessage.text, parsedMessage.parsedContent)
}

export const parseAndStoreMessageContent = async (
  parsedMessages: readonly ParsedMessage[],
  message: ChatMessage,
): Promise<readonly ParsedMessage[]> => {
  const existingParsedMessage = parsedMessages.find((item) => item.id === message.id)
  if (existingParsedMessage && existingParsedMessage.text === message.text) {
    return parsedMessages
  }
  await Promise.resolve()
  const parsedContent = message.text === '' ? emptyMessageContent : parseMessageContent(message.text)
  return setParsedMessageContent(parsedMessages, message.id, message.text, parsedContent)
}

export const parseAndStoreMessagesContent = async (
  parsedMessages: readonly ParsedMessage[],
  messages: readonly ChatMessage[],
): Promise<readonly ParsedMessage[]> => {
  let nextParsedMessages = parsedMessages
  for (const message of messages) {
    nextParsedMessages = await parseAndStoreMessageContent(nextParsedMessages, message)
  }
  return nextParsedMessages
}

export const getEmptyMessageContent = (): readonly MessageIntermediateNode[] => {
  return emptyMessageContent
}
