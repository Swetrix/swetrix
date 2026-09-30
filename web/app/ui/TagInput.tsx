import { Description, Field, Input, Label } from '@headlessui/react'
import { XIcon } from '@phosphor-icons/react'
import cx from 'clsx'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from './Text'

interface TagInputProps {
  name: string
  value: string
  onChange: (value: string) => void
  label: string
  hint?: string
  placeholder?: string
  instructions?: string
  error?: string | null
  className?: string
}

const splitValues = (value: string) =>
  value
    .split(/[,\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const TagInput = ({
  name,
  value,
  onChange,
  label,
  hint,
  placeholder,
  instructions,
  error,
  className,
}: TagInputProps) => {
  const { t } = useTranslation('common')
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const values = splitValues(value)

  useEffect(() => {
    if (editingIndex !== null) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editingIndex])

  const commit = (text = draft) => {
    const additions = splitValues(text)
    const next = [...values]

    if (editingIndex === null) {
      next.push(...additions)
    } else {
      next.splice(editingIndex, 1, ...additions)
    }

    const nextValue = next.join(', ')
    if (nextValue !== value) onChange(nextValue)
    setDraft('')
    setEditingIndex(null)
    return next
  }

  const edit = (index: number) => {
    const selected = values[index]
    const next = commit()
    const nextIndex =
      editingIndex !== null && editingIndex < index
        ? index + next.length - values.length
        : index

    setDraft(selected)
    setEditingIndex(nextIndex)
  }

  const remove = (index: number) => {
    onChange(values.filter((_, itemIndex) => itemIndex !== index).join(', '))
    if (editingIndex !== null && index < editingIndex) {
      setEditingIndex(editingIndex - 1)
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return

    if (event.key === ',' || event.key === 'Enter') {
      event.preventDefault()
      commit()
    } else if (
      event.key === 'Backspace' &&
      !draft &&
      editingIndex === null &&
      values.length
    ) {
      event.preventDefault()
      edit(values.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDraft('')
      setEditingIndex(null)
    }
  }

  return (
    <Field as='div' className={cx('flex flex-col gap-1', className)}>
      <Label>
        <Text
          as='span'
          size='sm'
          weight='medium'
          className='leading-tight'
          colour='primary'
        >
          {label}
        </Text>
      </Label>
      {hint ? (
        <Description as='div'>
          <Text
            as='span'
            size='sm'
            colour='secondary'
            className='block leading-tight'
          >
            {hint}
          </Text>
        </Description>
      ) : null}
      <div
        className={cx(
          'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md bg-white px-2 py-1.5 ring-1 transition-shadow duration-150 ease-out ring-inset focus-within:ring-2 dark:bg-slate-950',
          error
            ? 'ring-red-500 focus-within:ring-red-500 dark:ring-red-500/80 dark:focus-within:ring-red-400'
            : 'ring-gray-300 focus-within:ring-slate-900 hover:ring-gray-400 dark:ring-slate-700/80 dark:focus-within:ring-slate-300 dark:hover:ring-slate-600',
        )}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) commit()
        }}
      >
        {values.map((item, index) =>
          index === editingIndex ? null : (
            <span
              key={`${index}-${item}`}
              className='inline-flex max-w-full items-center rounded-md bg-gray-100 text-sm text-gray-700 ring-1 ring-gray-200/70 ring-inset dark:bg-slate-800 dark:text-gray-200 dark:ring-slate-700'
            >
              <button
                type='button'
                className='min-w-0 rounded-l-md px-2 py-0.5 text-left break-all hover:bg-gray-200/70 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:hover:bg-slate-700 dark:focus-visible:ring-slate-300'
                aria-label={`${t('common.edit')} ${item}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => edit(index)}
              >
                {item}
              </button>
              <button
                type='button'
                className='flex size-6 shrink-0 items-center justify-center rounded-r-md text-gray-400 hover:bg-gray-200/70 hover:text-gray-700 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden dark:text-gray-500 dark:hover:bg-slate-700 dark:hover:text-gray-200 dark:focus-visible:ring-slate-300'
                aria-label={`${t('common.remove')} ${item}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => remove(index)}
              >
                <XIcon className='size-3.5' aria-hidden='true' />
              </button>
            </span>
          ),
        )}
        <Input
          ref={inputRef}
          className='min-w-24 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-gray-900 shadow-none outline-hidden placeholder:text-gray-400 focus:ring-0 dark:text-gray-50 dark:placeholder:text-gray-500'
          value={draft}
          placeholder={values.length ? undefined : placeholder}
          autoComplete='off'
          autoCapitalize='none'
          spellCheck={false}
          invalid={Boolean(error)}
          aria-invalid={Boolean(error) || undefined}
          onChange={(event) => {
            const text = event.target.value
            if (
              text.includes(',') &&
              !(event.nativeEvent as InputEvent).isComposing
            ) {
              const lastComma = text.lastIndexOf(',')
              commit(text.slice(0, lastComma))
              setDraft(text.slice(lastComma + 1).trimStart())
            } else {
              setDraft(text)
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text')
            if (!/[,\r\n]/.test(pasted)) return
            event.preventDefault()
            const { selectionStart, selectionEnd } = event.currentTarget
            commit(
              draft.slice(0, selectionStart ?? draft.length) +
                pasted +
                draft.slice(selectionEnd ?? draft.length),
            )
          }}
          onKeyDown={handleKeyDown}
        />
        <input type='hidden' name={name} value={value} />
      </div>
      {instructions ? (
        <Description className='text-xs text-gray-500 dark:text-gray-400'>
          {instructions}
        </Description>
      ) : null}
      {error ? (
        <Description as='div' role='alert'>
          <Text as='span' size='sm' colour='error'>
            {error}
          </Text>
        </Description>
      ) : null}
    </Field>
  )
}

export default TagInput
