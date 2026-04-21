type ContentSegment =
  | { kind: 'text'; text: string }
  | { kind: 'chart'; chart: any; pending?: boolean }

const CHART_START_PATTERN = '{"type":"chart"'

export const parseSegments = (content: string): ContentSegment[] => {
  const segments: ContentSegment[] = []
  let cursor = 0

  while (cursor < content.length) {
    const startIndex = content.indexOf(CHART_START_PATTERN, cursor)
    if (startIndex === -1) {
      const tail = content.slice(cursor)
      if (tail) segments.push({ kind: 'text', text: tail })
      break
    }

    if (startIndex > cursor) {
      segments.push({ kind: 'text', text: content.slice(cursor, startIndex) })
    }

    let braceCount = 0
    let endIndex = -1
    let inString = false
    let escape = false

    for (let i = startIndex; i < content.length; i++) {
      const ch = content[i]
      if (escape) {
        escape = false
        continue
      }
      if (ch === '\\') {
        escape = true
        continue
      }
      if (ch === '"') {
        inString = !inString
        continue
      }
      if (inString) continue
      if (ch === '{') braceCount++
      else if (ch === '}') {
        braceCount--
        if (braceCount === 0) {
          endIndex = i
          break
        }
      }
    }

    if (endIndex === -1) {
      // Chart JSON still streaming – keep raw text out of view to avoid showing JSON
      segments.push({ kind: 'chart', chart: null, pending: true })
      cursor = content.length
      break
    }

    const jsonString = content.substring(startIndex, endIndex + 1)
    try {
      const chartData = JSON.parse(jsonString)
      if (chartData?.type === 'chart') {
        segments.push({ kind: 'chart', chart: chartData })
      } else {
        segments.push({ kind: 'text', text: jsonString })
      }
    } catch {
      segments.push({ kind: 'chart', chart: null, pending: true })
    }
    cursor = endIndex + 1
  }

  // Trim leading/trailing whitespace-only text segments
  while (
    segments.length &&
    segments[0].kind === 'text' &&
    !segments[0].text.trim()
  ) {
    segments.shift()
  }
  while (
    segments.length &&
    segments[segments.length - 1].kind === 'text' &&
    !(segments[segments.length - 1] as { text: string }).text.trim()
  ) {
    segments.pop()
  }

  return segments
}
