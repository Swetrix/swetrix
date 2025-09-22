import { useRef, useEffect, createElement } from 'react'

interface DangerouslySetHtmlContentProps extends React.HTMLAttributes<HTMLDivElement> {
  html: string
  allowRerender?: boolean
}

export const DangerouslySetHtmlContent = ({
  html,
  // eslint-disable-next-line unused-imports/no-unused-vars
  dangerouslySetInnerHTML,
  allowRerender,
  ...rest
}: DangerouslySetHtmlContentProps) => {
  // We remove 'dangerouslySetInnerHTML' from props passed to the div
  const divRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (!html || !divRef.current) throw new Error("html prop can't be null")
    if (!isFirstRender.current) return
    isFirstRender.current = Boolean(allowRerender)

    const slotHtml = document.createRange().createContextualFragment(html) // Create a 'tiny' document and parse the html string
    divRef.current.innerHTML = '' // Clear the container
    divRef.current.appendChild(slotHtml) // Append the new content
  }, [html, divRef, allowRerender])

  return createElement('div', { ...rest, ref: divRef })
}
