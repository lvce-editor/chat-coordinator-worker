import { ChatMathWorker, ChatMessageParsingWorker, ChatStorageWorker } from '@lvce-editor/rpc-registry'
import type {
  ChatMessage,
  ChatViewContentNode,
  ChatViewDomNode,
  ChatViewInlineNode,
  ChatViewItem,
  ChatViewListItemNode,
  ChatViewModel,
  ChatViewTableCellNode,
  ComposerAttachment,
} from '../ChatViewModel/ChatViewModel.ts'
import { toFinalMessages } from '../ToFinalMessages/ToFinalMessages.ts'

interface GetChatViewModelOptions {
  readonly sessionId: string
  readonly useChatMathWorker?: boolean
}

const emptyParsedContent: readonly ChatViewContentNode[] = [
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

const hasMessageText = (message: ChatMessage): boolean => {
  return message.text.trim().length > 0
}

const isImageAttachment = (attachment: ComposerAttachment): boolean => {
  return attachment.displayType === 'image'
}

const withAttachments = (message: ChatMessage, attachments: readonly ComposerAttachment[]): ChatMessage => {
  const { attachments: _attachments, ...messageWithoutAttachments } = message
  if (attachments.length === 0) {
    return messageWithoutAttachments
  }
  return {
    ...messageWithoutAttachments,
    attachments,
  }
}

const getDisplayItems = (messages: readonly ChatMessage[]): readonly ChatViewItem[] => {
  const displayMessages: ChatViewItem[] = []
  for (const message of messages) {
    if (message.role === 'user') {
      const attachments = message.attachments ?? []
      const imageAttachments = attachments.filter(isImageAttachment)
      if (imageAttachments.length > 0) {
        const nonImageAttachments = attachments.filter((attachment) => !isImageAttachment(attachment))
        if (hasMessageText(message) || nonImageAttachments.length > 0) {
          displayMessages.push({
            message: withAttachments(message, nonImageAttachments),
            parsedContent: hasMessageText(message) ? [] : emptyParsedContent,
          })
        }
        for (const attachment of imageAttachments) {
          displayMessages.push({
            message: {
              ...withAttachments(message, [attachment]),
              text: '',
            },
            parsedContent: emptyParsedContent,
            standaloneImageAttachment: attachment,
          })
        }
        continue
      }
    }
    if (message.role !== 'assistant' || !message.toolCalls || message.toolCalls.length === 0) {
      displayMessages.push({ message, parsedContent: hasMessageText(message) ? [] : emptyParsedContent })
      continue
    }
    displayMessages.push({
      message: {
        ...message,
        text: '',
      },
      parsedContent: emptyParsedContent,
    })
    if (hasMessageText(message)) {
      const { toolCalls: _toolCalls, ...messageWithoutToolCalls } = message
      displayMessages.push({
        message: messageWithoutToolCalls,
        parsedContent: [],
      })
    }
  }
  return displayMessages
}

const toChatViewDomNodes = (nodes: readonly unknown[]): readonly ChatViewDomNode[] => {
  return nodes.map((node) => ({ ...(node as Record<string, unknown>) }))
}

const renderMathInline = async (children: readonly ChatViewInlineNode[], useChatMathWorker: boolean): Promise<readonly ChatViewInlineNode[]> => {
  if (!useChatMathWorker) {
    return children
  }
  const nextChildren: ChatViewInlineNode[] = []
  for (const child of children) {
    if (child.type === 'math-inline') {
      const dom = await ChatMathWorker.getMathInlineDom(child)
      nextChildren.push({
        dom: toChatViewDomNodes(dom as readonly unknown[]),
        type: 'math-inline-dom',
      })
      continue
    }
    if (child.type === 'bold' || child.type === 'italic' || child.type === 'strikethrough') {
      nextChildren.push({
        ...child,
        children: await renderMathInline(child.children, useChatMathWorker),
      })
      continue
    }
    nextChildren.push(child)
  }
  return nextChildren
}

const renderMathListItem = async (item: ChatViewListItemNode, useChatMathWorker: boolean): Promise<ChatViewListItemNode> => {
  const children = await renderMathInline(item.children, useChatMathWorker)
  if (!item.nestedItems) {
    return {
      ...item,
      children,
    }
  }
  const nestedItems: ChatViewListItemNode[] = []
  for (const nestedItem of item.nestedItems) {
    nestedItems.push(await renderMathListItem(nestedItem, useChatMathWorker))
  }
  return {
    ...item,
    children,
    nestedItems,
  }
}

const renderMathTableCell = async (cell: ChatViewTableCellNode, useChatMathWorker: boolean): Promise<ChatViewTableCellNode> => {
  return {
    ...cell,
    children: await renderMathInline(cell.children, useChatMathWorker),
  }
}

const renderMathNode = async (node: ChatViewContentNode, useChatMathWorker: boolean): Promise<ChatViewContentNode> => {
  if (node.type === 'math-block') {
    if (!useChatMathWorker) {
      return node
    }
    const dom = await ChatMathWorker.getMathBlockDom(node)
    return {
      dom: toChatViewDomNodes(dom as readonly unknown[]),
      type: 'math-block-dom',
    }
  }
  if (node.type === 'text' || node.type === 'heading') {
    return {
      ...node,
      children: await renderMathInline(node.children, useChatMathWorker),
    }
  }
  if (node.type === 'blockquote') {
    const children: ChatViewContentNode[] = []
    for (const child of node.children) {
      children.push(await renderMathNode(child, useChatMathWorker))
    }
    return {
      ...node,
      children,
    }
  }
  if (node.type === 'ordered-list' || node.type === 'unordered-list') {
    const items: ChatViewListItemNode[] = []
    for (const item of node.items) {
      items.push(await renderMathListItem(item, useChatMathWorker))
    }
    return {
      ...node,
      items,
    }
  }
  if (node.type === 'table') {
    const headers: ChatViewTableCellNode[] = []
    for (const header of node.headers) {
      headers.push(await renderMathTableCell(header, useChatMathWorker))
    }
    const rows = []
    for (const row of node.rows) {
      const cells: ChatViewTableCellNode[] = []
      for (const cell of row.cells) {
        cells.push(await renderMathTableCell(cell, useChatMathWorker))
      }
      rows.push({
        ...row,
        cells,
      })
    }
    return {
      ...node,
      headers,
      rows,
    }
  }
  return node
}

const renderMathNodes = async (
  nodes: readonly ChatViewContentNode[],
  useChatMathWorker: boolean,
): Promise<readonly ChatViewContentNode[]> => {
  const rendered: ChatViewContentNode[] = []
  for (const node of nodes) {
    rendered.push(await renderMathNode(node, useChatMathWorker))
  }
  return rendered
}

export const getChatViewModel = async ({ sessionId, useChatMathWorker = true }: GetChatViewModelOptions): Promise<ChatViewModel> => {
  const events = (await ChatStorageWorker.getEvents(sessionId)) as readonly unknown[]
  const messages = toFinalMessages(events)
  const displayItems = getDisplayItems(messages)
  const itemsNeedingParsing = displayItems.filter((item) => hasMessageText(item.message))
  const parsedContents = itemsNeedingParsing.length
    ? ((await ChatMessageParsingWorker.invoke(
        'ChatMessageParsing.parseMessageContents',
        itemsNeedingParsing.map((item) => item.message.text),
      )) as readonly (readonly ChatViewContentNode[])[])
    : []
  let parsedIndex = 0
  const items: ChatViewItem[] = []
  for (const item of displayItems) {
    if (!hasMessageText(item.message)) {
      items.push(item)
      continue
    }
    const parsedContent = parsedContents[parsedIndex] || emptyParsedContent
    parsedIndex += 1
    items.push({
      ...item,
      parsedContent: await renderMathNodes(parsedContent, useChatMathWorker),
    })
  }
  return {
    items,
    sessionId,
  }
}
