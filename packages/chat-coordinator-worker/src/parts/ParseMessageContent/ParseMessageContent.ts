import type {
  MessageInlineNode,
  MessageIntermediateNode,
  MessageListItemNode,
  MessageTableCellNode,
  MessageTableRowNode,
} from '../ParseMessageContentTypes/ParseMessageContentTypes.ts'

const orderedListItemRegex = /^\s*\d+\.\s+(.*)$/
const unorderedListItemRegex = /^(\s*)[-*]\s+(.*)$/
const markdownInlineRegex =
  /\[([^\]]+)\]\(((?:[^()\n]+|\([^()\n]*\))+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|(?<![a-zA-Z0-9])(?<mathDollars>\${1,2})(?!\.|\(["'])(?<mathText>(?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\k<mathDollars>(?![a-zA-Z0-9])/g
const markdownItalicWithBoldRegex = /\*([^*\n]*?)\*\*([^*\n]+)\*\*([^*\n]*?)\*/g
const markdownTableSeparatorCellRegex = /^:?-{3,}:?$/
const fencedCodeBlockRegex = /^```/
const markdownHeadingRegex = /^\s*(#{1,6})\s+(.*)$/
const markdownMathBlockDelimiter = '$$'

const isHttpUrl = (url: string): boolean => {
  const normalized = url.trim().toLowerCase()
  return normalized.startsWith('http://') || normalized.startsWith('https://')
}

const sanitizeUrl = (url: string): string => {
  return isHttpUrl(url) ? url : '#'
}

const normalizeEscapedNewlines = (value: string): string => {
  if (value.includes('\\n')) {
    return value.replaceAll(/\\r\\n|\\n/g, '\n')
  }
  return value
}

const normalizeInlineTables = (value: string): string => {
  return value
    .split(/\r?\n/)
    .map((line) => {
      if (!line.includes('|')) {
        return line
      }
      if (!/\|\s*[-:]{3,}/.test(line)) {
        return line
      }
      return line.replaceAll(/\|\s+\|/g, '|\n|')
    })
    .join('\n')
}

const isTableRow = (line: string): boolean => {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return false
  }
  return trimmed.length > 2 && trimmed.slice(1, -1).includes('|')
}

const getTableCells = (line: string): readonly string[] => {
  const trimmed = line.trim()
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((part) => part.trim())
}

const isTableSeparatorRow = (line: string, expectedColumns: number): boolean => {
  if (!isTableRow(line)) {
    return false
  }
  const cells = getTableCells(line)
  if (cells.length !== expectedColumns) {
    return false
  }
  return cells.every((cell) => markdownTableSeparatorCellRegex.test(cell))
}

const toTableCell = (value: string): MessageTableCellNode => {
  return {
    children: parseInlineNodes(value),
    type: 'table-cell',
  }
}

const toTableRow = (line: string): MessageTableRowNode => {
  return {
    cells: getTableCells(line).map(toTableCell),
    type: 'table-row',
  }
}

const parseInlineNodesSimple = (value: string): readonly MessageInlineNode[] => {
  const matches = value.matchAll(markdownInlineRegex)
  const nodes: MessageInlineNode[] = []
  let lastIndex = 0

  for (const match of matches) {
    const fullMatch = match[0]
    const linkText = match[1]
    const href = match[2]
    const boldText = match[3]
    const italicText = match[4]
    const mathDollars = match.groups?.mathDollars
    const mathText = match.groups?.mathText
    const index = match.index ?? 0
    if (index > lastIndex) {
      nodes.push({
        text: value.slice(lastIndex, index),
        type: 'text',
      })
    }
    if (linkText && href) {
      nodes.push({
        href: sanitizeUrl(href),
        text: linkText,
        type: 'link',
      })
    } else if (boldText) {
      nodes.push({
        text: boldText,
        type: 'bold',
      })
    } else if (italicText) {
      nodes.push({
        text: italicText,
        type: 'italic',
      })
    } else if (mathDollars && mathText) {
      nodes.push({
        displayMode: mathDollars.length === 2,
        text: mathText.trim(),
        type: 'math-inline',
      })
    }
    lastIndex = index + fullMatch.length
  }

  if (lastIndex < value.length) {
    nodes.push({
      text: value.slice(lastIndex),
      type: 'text',
    })
  }

  if (nodes.length === 0) {
    return [
      {
        text: value,
        type: 'text',
      },
    ]
  }

  return nodes
}

const parseInlineNodes = (value: string): readonly MessageInlineNode[] => {
  const nestedMatches = value.matchAll(markdownItalicWithBoldRegex)
  const nodes: MessageInlineNode[] = []
  let lastIndex = 0
  let foundNestedItalicBold = false

  for (const match of nestedMatches) {
    const fullMatch = match[0]
    const italicBefore = match[1]
    const boldText = match[2]
    const italicAfter = match[3]
    const index = match.index ?? 0
    foundNestedItalicBold = true

    if (index > lastIndex) {
      nodes.push(...parseInlineNodesSimple(value.slice(lastIndex, index)))
    }

    if (italicBefore) {
      nodes.push({
        text: italicBefore,
        type: 'italic',
      })
    }

    nodes.push({
      text: boldText,
      type: 'bold',
    })

    if (italicAfter) {
      nodes.push({
        text: italicAfter,
        type: 'italic',
      })
    }

    lastIndex = index + fullMatch.length
  }

  if (!foundNestedItalicBold) {
    return parseInlineNodesSimple(value)
  }

  if (lastIndex < value.length) {
    nodes.push(...parseInlineNodesSimple(value.slice(lastIndex)))
  }

  if (nodes.length === 0) {
    return [
      {
        text: value,
        type: 'text',
      },
    ]
  }

  return nodes
}

export const parseMessageContent = (rawMessage: string): readonly MessageIntermediateNode[] => {
  if (rawMessage === '') {
    return [
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
  }

  const normalizedMessage = normalizeEscapedNewlines(rawMessage)
  const lines = normalizeInlineTables(normalizedMessage).split(/\r?\n/)
  const nodes: MessageIntermediateNode[] = []
  let paragraphLines: string[] = []
  let listItems: MessageListItemNode[] = []
  let listType: 'ordered-list' | 'unordered-list' | '' = ''

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return
    }
    nodes.push({
      children: parseInlineNodes(paragraphLines.join('\n')),
      type: 'text',
    })
    paragraphLines = []
  }

  const flushList = (): void => {
    if (listItems.length === 0) {
      return
    }
    nodes.push({
      items: listItems,
      type: listType || 'ordered-list',
    })
    listItems = []
    listType = ''
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) {
      flushList()
      flushParagraph()
      continue
    }

    if (fencedCodeBlockRegex.test(line.trim())) {
      flushList()
      flushParagraph()
      const language = line.trim().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !fencedCodeBlockRegex.test(lines[i].trim())) {
        codeLines.push(lines[i])
        i++
      }
      if (language) {
        nodes.push({
          language,
          text: codeLines.join('\n'),
          type: 'code-block',
        })
      } else {
        nodes.push({
          text: codeLines.join('\n'),
          type: 'code-block',
        })
      }
      continue
    }

    if (line.trim() === markdownMathBlockDelimiter) {
      const endIndex = lines.findIndex((candidate, index) => {
        if (index <= i) {
          return false
        }
        return candidate.trim() === markdownMathBlockDelimiter
      })
      if (endIndex !== -1) {
        flushList()
        flushParagraph()
        const mathText = lines
          .slice(i + 1, endIndex)
          .join('\n')
          .trim()
        nodes.push({
          text: mathText,
          type: 'math-block',
        })
        i = endIndex
        continue
      }
    }

    if (isTableRow(line) && i + 1 < lines.length) {
      const headerCells = getTableCells(line)
      if (isTableSeparatorRow(lines[i + 1], headerCells.length)) {
        flushList()
        flushParagraph()
        const rows: MessageTableRowNode[] = []
        i += 2
        while (i < lines.length && isTableRow(lines[i])) {
          const row = toTableRow(lines[i])
          if (row.cells.length === headerCells.length) {
            rows.push(row)
          }
          i++
        }
        i--
        nodes.push({
          headers: headerCells.map(toTableCell),
          rows,
          type: 'table',
        })
        continue
      }
    }

    const orderedMatch = line.match(orderedListItemRegex)
    if (orderedMatch) {
      if (listType && listType !== 'ordered-list') {
        flushList()
      }
      flushParagraph()
      listType = 'ordered-list'
      listItems.push({
        children: parseInlineNodes(orderedMatch[1]),
        type: 'list-item',
      })
      continue
    }

    const unorderedMatch = line.match(unorderedListItemRegex)
    if (unorderedMatch) {
      const indentation = unorderedMatch[1]
      const unorderedText = unorderedMatch[2]
      if (listType === 'ordered-list' && listItems.length > 0 && indentation.length > 0) {
        const lastIndex = listItems.length - 1
        const previousItem = listItems[lastIndex]
        const nestedItems = previousItem.nestedItems ? [...previousItem.nestedItems] : []
        nestedItems.push({
          children: parseInlineNodes(unorderedText),
          type: 'list-item',
        })
        listItems[lastIndex] = {
          ...previousItem,
          nestedItems,
        }
        continue
      }
      if (listType && listType !== 'unordered-list') {
        flushList()
      }
      flushParagraph()
      listType = 'unordered-list'
      listItems.push({
        children: parseInlineNodes(unorderedText),
        type: 'list-item',
      })
      continue
    }

    const headingMatch = line.match(markdownHeadingRegex)
    if (headingMatch) {
      flushList()
      flushParagraph()
      nodes.push({
        children: parseInlineNodes(headingMatch[2]),
        level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        type: 'heading',
      })
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushList()
  flushParagraph()

  return nodes.length === 0
    ? [
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
    : nodes
}
