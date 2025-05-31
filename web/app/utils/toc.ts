export interface TocItem {
  id: string
  text: string
  level: number
  children: TocItem[]
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
}

export function renderTocAsHtml(items: TocItem[]): string {
  if (items.length === 0) return ''

  const renderTocList = (tocItems: TocItem[], level = 0, parentNum = ''): string => {
    if (tocItems.length === 0) return ''

    let html = `<ol class="${level > 0 ? '!my-0' : ''}">`

    tocItems.forEach((item, index) => {
      const currentNumber = parentNum ? `${parentNum}.${index + 1}` : `${index + 1}`

      html += `<li class="flex flex-col">`
      html += `<div class="flex items-start gap-0.5">`
      html += `<span class="text-gray-600 dark:text-gray-400 font-medium mr-[1ch]">${currentNumber}.</span>`
      html += `<a href="#${item.id}">${item.text}</a>`
      html += `</div>`

      if (item.children.length > 0) {
        html += renderTocList(item.children, level + 1, currentNumber)
      }

      html += `</li>`
    })

    html += `</ol>`
    return html
  }

  const tocHtml = renderTocList(items)

  return tocHtml
}

export function extractTableOfContents(html: string): TocItem[] {
  const headerRegex = /<h([1-6])(?:\s+id="([^"]*)")?[^>]*>(.*?)<\/h[1-6]>/gi
  const tocItems: TocItem[] = []
  const stack: TocItem[] = []
  let match

  while ((match = headerRegex.exec(html)) !== null) {
    const level = parseInt(match[1])
    const existingId = match[2]
    const text = match[3].replace(/<[^>]*>/g, '').trim() // Remove HTML tags
    const id = existingId || generateSlug(text)

    const tocItem: TocItem = {
      id,
      text,
      level,
      children: [],
    }

    // Pop stack until we find a parent with lower level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    if (stack.length === 0) {
      // Top level item
      tocItems.push(tocItem)
    } else {
      // Child item
      stack[stack.length - 1].children.push(tocItem)
    }

    stack.push(tocItem)
  }

  return tocItems
}

export function ensureHeaderIds(html: string): string {
  return html.replace(
    /<h([1-6])(?:\s+id="([^"]*)")?([^>]*)>(.*?)<\/h[1-6]>/gi,
    (match, level, existingId, attrs, content) => {
      if (existingId) {
        return match // Already has an ID
      }

      const text = content.replace(/<[^>]*>/g, '').trim()
      const id = generateSlug(text)

      return `<h${level} id="${id}"${attrs}>${content}</h${level}>`
    },
  )
}
