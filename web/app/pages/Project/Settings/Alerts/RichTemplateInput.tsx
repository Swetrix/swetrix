import { Description, Field, Label } from '@headlessui/react'
import cx from 'clsx'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { cn } from '~/utils/generic'

export interface TemplateVariableInfo {
  name: string
  description?: string
}

interface RichTemplateInputProps {
  value: string
  onChange: (value: string) => void
  variables: TemplateVariableInfo[]
  label?: string
  hint?: React.ReactNode
  rows?: number
  placeholder?: string
  className?: string
}

interface ParsedToken {
  start: number
  end: number
  name: string
  known: boolean
}

const TOKEN_REGEX = /\{\{\s*([\w_]+)\s*\}\}/g

const parseTokens = (text: string, knownNames: Set<string>): ParsedToken[] => {
  const tokens: ParsedToken[] = []
  let m: RegExpExecArray | null
  TOKEN_REGEX.lastIndex = 0
  while ((m = TOKEN_REGEX.exec(text)) !== null) {
    tokens.push({
      start: m.index,
      end: m.index + m[0].length,
      name: m[1],
      known: knownNames.has(m[1]),
    })
  }
  return tokens
}

const buildSegments = (
  text: string,
  tokens: ParsedToken[],
): React.ReactNode[] => {
  const nodes: React.ReactNode[] = []
  let cursor = 0
  tokens.forEach((tok, idx) => {
    if (tok.start > cursor) {
      nodes.push(<span key={`t-${idx}`}>{text.slice(cursor, tok.start)}</span>)
    }
    nodes.push(
      <span
        key={`v-${idx}-${tok.start}`}
        data-template-token={tok.name}
        data-token-known={tok.known ? 'true' : 'false'}
        className={cx(
          'rounded-[3px] ring-1 transition-colors',
          tok.known
            ? 'bg-indigo-50 text-indigo-700 ring-indigo-200/80 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-400/30'
            : 'bg-amber-50 text-amber-700 ring-amber-200/80 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/30',
        )}
      >
        {text.slice(tok.start, tok.end)}
      </span>,
    )
    cursor = tok.end
  })
  if (cursor < text.length) {
    nodes.push(<span key='tail'>{text.slice(cursor)}</span>)
  }
  // Trailing newline rendering quirk — textareas reserve a line for trailing \n
  if (text.endsWith('\n')) {
    nodes.push(<span key='nl'>{'\u200b'}</span>)
  }
  return nodes
}

interface SuggestionState {
  query: string
  anchorStart: number // index of first `{` of the trigger
  caret: { left: number; top: number; lineHeight: number } | null
}

interface HoverState {
  name: string
  description?: string
  rect: DOMRect
}

const useCaretCoordinates = () => {
  const mirrorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (mirrorRef.current) return
    const div = document.createElement('div')
    div.setAttribute('aria-hidden', 'true')
    div.style.position = 'absolute'
    div.style.visibility = 'hidden'
    div.style.whiteSpace = 'pre-wrap'
    div.style.wordWrap = 'break-word'
    div.style.overflow = 'hidden'
    div.style.top = '0'
    div.style.left = '0'
    div.style.pointerEvents = 'none'
    document.body.appendChild(div)
    mirrorRef.current = div
    return () => {
      document.body.removeChild(div)
      mirrorRef.current = null
    }
  }, [])

  return useCallback(
    (
      ta: HTMLTextAreaElement,
      pos: number,
    ): { left: number; top: number; lineHeight: number } => {
      const div = mirrorRef.current
      if (!div) return { left: 0, top: 0, lineHeight: 18 }
      const cs = getComputedStyle(ta)
      const props = [
        'boxSizing',
        'width',
        'height',
        'overflowX',
        'overflowY',
        'borderTopWidth',
        'borderRightWidth',
        'borderBottomWidth',
        'borderLeftWidth',
        'borderStyle',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'fontStyle',
        'fontVariant',
        'fontWeight',
        'fontStretch',
        'fontSize',
        'fontSizeAdjust',
        'lineHeight',
        'fontFamily',
        'textAlign',
        'textTransform',
        'textIndent',
        'textDecoration',
        'letterSpacing',
        'wordSpacing',
        'tabSize',
      ] as const
      props.forEach((p) => {
        ;(div.style as any)[p] = cs[p]
      })
      div.style.width = ta.clientWidth + 'px'
      div.style.height = 'auto'
      div.textContent = ta.value.slice(0, pos)
      const span = document.createElement('span')
      span.textContent = ta.value.slice(pos) || '.'
      div.appendChild(span)
      const spanRect = span.getBoundingClientRect()
      const divRect = div.getBoundingClientRect()
      const lineHeight =
        parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
      const left = spanRect.left - divRect.left
      const top = spanRect.top - divRect.top
      div.removeChild(span)
      return { left, top, lineHeight }
    },
    [],
  )
}

const RichTemplateInput = forwardRef<
  HTMLTextAreaElement,
  RichTemplateInputProps
>(
  (
    {
      value,
      onChange,
      variables,
      label,
      hint,
      rows = 6,
      placeholder,
      className,
    },
    ref,
  ) => {
    const taRef = useRef<HTMLTextAreaElement | null>(null)
    useImperativeHandle(ref, () => taRef.current as HTMLTextAreaElement)
    const mirrorRef = useRef<HTMLDivElement | null>(null)
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const getCaret = useCaretCoordinates()

    const [scrollTop, setScrollTop] = useState(0)
    const [scrollLeft, setScrollLeft] = useState(0)
    const [suggestion, setSuggestion] = useState<SuggestionState | null>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const [hover, setHover] = useState<HoverState | null>(null)
    const hoverDebounceRef = useRef<number | null>(null)

    const knownNames = useMemo(
      () => new Set(variables.map((v) => v.name)),
      [variables],
    )
    const descriptions = useMemo(() => {
      const m = new Map<string, string | undefined>()
      variables.forEach((v) => m.set(v.name, v.description))
      return m
    }, [variables])
    const tokens = useMemo(
      () => parseTokens(value, knownNames),
      [value, knownNames],
    )
    const segments = useMemo(
      () => buildSegments(value, tokens),
      [value, tokens],
    )

    const filteredVariables = useMemo(() => {
      if (!suggestion) return []
      const q = suggestion.query.toLowerCase()
      const list = variables.filter((v) => v.name.toLowerCase().includes(q))
      list.sort((a, b) => {
        const ai = a.name.toLowerCase().indexOf(q)
        const bi = b.name.toLowerCase().indexOf(q)
        if (ai === bi) return a.name.localeCompare(b.name)
        return ai - bi
      })
      return list
    }, [suggestion, variables])

    useEffect(() => {
      if (!suggestion) return
      if (filteredVariables.length === 0) {
        setActiveIndex(0)
        return
      }
      if (activeIndex >= filteredVariables.length) {
        setActiveIndex(0)
      }
    }, [filteredVariables, activeIndex, suggestion])

    const closeSuggestions = useCallback(() => {
      setSuggestion(null)
      setActiveIndex(0)
    }, [])

    const updateSuggestionFromCursor = useCallback(() => {
      const ta = taRef.current
      if (!ta) return
      const pos = ta.selectionStart ?? value.length
      if (pos !== ta.selectionEnd) {
        closeSuggestions()
        return
      }
      const text = ta.value

      // Walk backwards from cursor through identifier characters.
      let identStart = pos
      while (identStart > 0 && /[\w_]/.test(text[identStart - 1])) {
        identStart--
      }
      // Optional whitespace between `{` and identifier
      let braceEnd = identStart
      while (braceEnd > 0 && /\s/.test(text[braceEnd - 1])) {
        braceEnd--
      }
      // Need at least one `{` immediately before
      if (braceEnd === 0 || text[braceEnd - 1] !== '{') {
        closeSuggestions()
        return
      }
      let anchor = braceEnd - 1
      // Consume an optional second `{`
      if (anchor > 0 && text[anchor - 1] === '{') {
        anchor--
      }
      const query = text.slice(identStart, pos)
      const caret = getCaret(ta, pos)
      setSuggestion({
        query,
        anchorStart: anchor,
        caret,
      })
    }, [closeSuggestions, getCaret, value])

    const insertSuggestion = useCallback(
      (name: string) => {
        const ta = taRef.current
        if (!ta || !suggestion) return
        const pos = ta.selectionStart ?? ta.value.length
        const before = ta.value.slice(0, suggestion.anchorStart)
        const after = ta.value.slice(pos)
        // If next chars are `}}` or `}`, consume them so we don't end up with `}}}}`
        let trimmedAfter = after
        if (trimmedAfter.startsWith('}}')) {
          trimmedAfter = trimmedAfter.slice(2)
        } else if (trimmedAfter.startsWith('}')) {
          trimmedAfter = trimmedAfter.slice(1)
        }
        const insertion = `{{${name}}}`
        const next = before + insertion + trimmedAfter
        onChange(next)
        const newPos = before.length + insertion.length
        requestAnimationFrame(() => {
          ta.focus()
          ta.setSelectionRange(newPos, newPos)
        })
        closeSuggestions()
      },
      [closeSuggestions, onChange, suggestion],
    )

    // Sync mirror scroll
    const onScroll = useCallback(() => {
      const ta = taRef.current
      if (!ta) return
      setScrollTop(ta.scrollTop)
      setScrollLeft(ta.scrollLeft)
    }, [])

    useLayoutEffect(() => {
      const m = mirrorRef.current
      if (!m) return
      m.scrollTop = scrollTop
      m.scrollLeft = scrollLeft
    }, [scrollTop, scrollLeft, segments])

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (suggestion && filteredVariables.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setActiveIndex((i) => (i + 1) % filteredVariables.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setActiveIndex(
            (i) =>
              (i - 1 + filteredVariables.length) % filteredVariables.length,
          )
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          const item = filteredVariables[activeIndex]
          if (item) insertSuggestion(item.name)
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          closeSuggestions()
          return
        }
      }
    }

    const onChangeInternal = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
      // Defer until value propagates; we check via the textarea ref directly
      // so we don't depend on stale closures.
      setTimeout(updateSuggestionFromCursor, 0)
    }

    const onSelectionChange = () => {
      updateSuggestionFromCursor()
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const mirror = mirrorRef.current
      if (!mirror) return

      let target: HTMLElement | null = null
      const tokenEls = mirror.querySelectorAll<HTMLElement>(
        '[data-template-token]',
      )
      for (const el of tokenEls) {
        const rect = el.getBoundingClientRect()
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          target = el
          break
        }
      }
      if (
        !target ||
        !target.dataset.templateToken ||
        !mirror.contains(target)
      ) {
        if (hoverDebounceRef.current !== null) {
          window.clearTimeout(hoverDebounceRef.current)
          hoverDebounceRef.current = null
        }
        if (hover) setHover(null)
        return
      }
      const name = target.dataset.templateToken
      const rect = target.getBoundingClientRect()
      if (hover && hover.name === name && hover.rect.top === rect.top) return
      if (hoverDebounceRef.current !== null) {
        window.clearTimeout(hoverDebounceRef.current)
      }
      hoverDebounceRef.current = window.setTimeout(() => {
        setHover({
          name,
          description: descriptions.get(name),
          rect,
        })
      }, 80)
    }

    const handleMouseLeave = () => {
      if (hoverDebounceRef.current !== null) {
        window.clearTimeout(hoverDebounceRef.current)
        hoverDebounceRef.current = null
      }
      setHover(null)
    }

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        const w = wrapperRef.current
        if (!w) return
        if (!w.contains(e.target as Node)) closeSuggestions()
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [closeSuggestions])

    const taClass =
      'block w-full resize-y rounded-md border-0 bg-transparent text-sm text-transparent caret-slate-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 selection:bg-slate-900/20 focus:ring-slate-900 focus:outline-none dark:caret-gray-100 dark:ring-slate-700/80 dark:placeholder:text-gray-500 dark:selection:bg-slate-100/25 dark:focus:ring-slate-300'

    const sharedTextStyle: React.CSSProperties = {
      padding: '0.5rem 0.75rem',
      lineHeight: '1.45',
    }

    return (
      <Field as='div' className={className}>
        {label ? (
          <Label className='mb-1 flex text-sm font-medium text-gray-900 dark:text-gray-200'>
            {label}
          </Label>
        ) : null}
        <div ref={wrapperRef} className='relative'>
          <div
            ref={mirrorRef}
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 overflow-hidden rounded-md text-sm wrap-break-word whitespace-pre-wrap text-gray-900 dark:text-gray-100'
            style={{
              ...sharedTextStyle,
              fontFamily: 'inherit',
              wordBreak: 'break-word',
            }}
          >
            {segments}
          </div>
          <textarea
            ref={taRef}
            rows={rows}
            value={value}
            onChange={onChangeInternal}
            onScroll={onScroll}
            onKeyDown={onKeyDown}
            onKeyUp={onSelectionChange}
            onClick={onSelectionChange}
            onSelect={onSelectionChange}
            onBlur={() => closeSuggestions()}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='off'
            className={cn(taClass, 'relative')}
            style={{
              ...sharedTextStyle,
              lineHeight: '1.45',
              fontFamily: 'inherit',
            }}
          />
          {suggestion && filteredVariables.length > 0 ? (
            <SuggestionMenu
              variables={filteredVariables}
              activeIndex={activeIndex}
              onPick={insertSuggestion}
              caret={suggestion.caret}
            />
          ) : null}
          {hover ? (
            <HoverTooltip
              name={hover.name}
              description={hover.description}
              rect={hover.rect}
              wrapperEl={wrapperRef.current}
            />
          ) : null}
        </div>
        {hint ? (
          <Description className='mt-2 text-xs whitespace-pre-line text-gray-500 dark:text-gray-300'>
            {hint}
          </Description>
        ) : null}
      </Field>
    )
  },
)

RichTemplateInput.displayName = 'RichTemplateInput'

interface SuggestionMenuProps {
  variables: TemplateVariableInfo[]
  activeIndex: number
  onPick: (name: string) => void
  caret: { left: number; top: number; lineHeight: number } | null
}

const SuggestionMenu = ({
  variables,
  activeIndex,
  onPick,
  caret,
}: SuggestionMenuProps) => {
  const ref = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const item = ref.current?.querySelector<HTMLElement>(`[data-active="true"]`)
    if (item) {
      item.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  if (!caret) return null

  return (
    <div
      ref={ref}
      className='absolute z-30 max-h-64 w-72 overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700'
      style={{
        top: caret.top + caret.lineHeight + 4,
        left: caret.left,
      }}
      role='listbox'
    >
      {variables.map((v, i) => (
        <button
          key={v.name}
          data-active={i === activeIndex ? 'true' : 'false'}
          type='button'
          onMouseDown={(e) => {
            e.preventDefault()
            onPick(v.name)
          }}
          role='option'
          aria-selected={i === activeIndex}
          className={cx(
            'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors',
            i === activeIndex
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-slate-800',
          )}
        >
          <span className='font-mono text-xs'>
            {`{{`}
            <span className='font-semibold'>{v.name}</span>
            {`}}`}
          </span>
          {v.description ? (
            <span
              className={cx(
                'text-[11px] leading-snug',
                i === activeIndex
                  ? 'text-slate-200 dark:text-slate-600'
                  : 'text-gray-500 dark:text-gray-400',
              )}
            >
              {v.description}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

interface HoverTooltipProps {
  name: string
  description?: string
  rect: DOMRect
  wrapperEl: HTMLElement | null
}

const HoverTooltip = ({
  name,
  description,
  rect,
  wrapperEl,
}: HoverTooltipProps) => {
  if (!wrapperEl) return null
  const wrapperRect = wrapperEl.getBoundingClientRect()
  const top = rect.top - wrapperRect.top - 8
  const left = rect.left - wrapperRect.left + rect.width / 2

  return (
    <div
      role='tooltip'
      className='pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white ring-1 ring-slate-900/80 dark:bg-slate-800'
      style={{ top, left }}
    >
      <div className='font-mono text-[11px] text-slate-300'>{`{{${name}}}`}</div>
      <div className='mt-0.5 max-w-64 leading-snug'>
        {description || 'Unknown variable'}
      </div>
    </div>
  )
}

export default RichTemplateInput
