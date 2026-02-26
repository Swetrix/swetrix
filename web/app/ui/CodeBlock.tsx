import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const highlightHTML = (code: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = []
  const regex =
    /(<\/?[a-zA-Z][a-zA-Z0-9]*)|(\s[a-zA-Z-]+(?==))|("[^"]*")|(&lt;\/?[a-zA-Z][a-zA-Z0-9]*)|(\/>|>)|(\/\/.*$)|(['"]https?:\/\/[^'"]*['"])|(swetrix\.\w+)|(document\.\w+)|(\b(?:function|var|const|let|document|window)\b)/gm
  let lastIndex = 0

  const matches = [...code.matchAll(regex)]

  for (const match of matches) {
    const [fullMatch] = match
    const index = match.index!

    if (index > lastIndex) {
      parts.push(code.slice(lastIndex, index))
    }

    if (fullMatch.startsWith('<') || fullMatch.startsWith('&lt;')) {
      parts.push(
        <span key={index} className='text-rose-600 dark:text-rose-400'>
          {fullMatch}
        </span>,
      )
    } else if (fullMatch.startsWith('"') || fullMatch.startsWith("'")) {
      parts.push(
        <span key={index} className='text-emerald-600 dark:text-emerald-400'>
          {fullMatch}
        </span>,
      )
    } else if (fullMatch === '/>' || fullMatch === '>') {
      parts.push(
        <span key={index} className='text-rose-600 dark:text-rose-400'>
          {fullMatch}
        </span>,
      )
    } else if (fullMatch.startsWith('//')) {
      parts.push(
        <span key={index} className='text-gray-400 dark:text-slate-500'>
          {fullMatch}
        </span>,
      )
    } else if (
      fullMatch.match(/^swetrix\.\w+/) ||
      fullMatch.match(/^document\.\w+/)
    ) {
      parts.push(
        <span key={index} className='text-sky-600 dark:text-sky-400'>
          {fullMatch}
        </span>,
      )
    } else if (fullMatch.match(/^\s[a-zA-Z-]+$/)) {
      parts.push(
        <span key={index} className='text-amber-600 dark:text-amber-400'>
          {fullMatch}
        </span>,
      )
    } else {
      parts.push(
        <span key={index} className='text-violet-600 dark:text-violet-400'>
          {fullMatch}
        </span>,
      )
    }

    lastIndex = index + fullMatch.length
  }

  if (lastIndex < code.length) {
    parts.push(code.slice(lastIndex))
  }

  return parts
}

interface CodeBlockProps {
  code: string
  onCopy?: () => void
}

const CodeBlock = ({ code, onCopy }: CodeBlockProps) => {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('common.failedToCopy'))
    }
  }

  const highlighted = useMemo(() => highlightHTML(code), [code])

  return (
    <div className='group relative'>
      <pre className='overflow-x-auto rounded-lg bg-white p-4 font-mono text-xs leading-relaxed ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-700'>
        <code>{highlighted}</code>
      </pre>
      <button
        type='button'
        onClick={handleCopy}
        className='absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
      >
        {copied ? (
          <>
            <CheckIcon className='size-3.5' />
            {t('common.copied')}
          </>
        ) : (
          <>
            <CopyIcon className='size-3.5' />
            {t('common.copy')}
          </>
        )}
      </button>
    </div>
  )
}

export default CodeBlock
