import { useCallback, useId, useRef, useState } from 'react'
import { UploadIcon, SpinnerIcon } from '@phosphor-icons/react'

import { cn } from '~/utils/generic'

import { Text } from './Text'

interface FileUploadProps {
  accept?: string
  disabled?: boolean
  loading?: boolean
  onFile: (file: File) => void
  label?: React.ReactNode
  hint?: React.ReactNode
  className?: string
}

export default function FileUpload({
  accept,
  disabled,
  loading,
  onFile,
  label,
  hint,
  className,
}: FileUploadProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const isDisabled = disabled || loading

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || isDisabled) return
      onFile(file)
    },
    [isDisabled, onFile],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isDisabled) setDragOver(true)
    },
    [isDisabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)
      if (isDisabled) return
      handleFile(e.dataTransfer.files?.[0])
    },
    [isDisabled, handleFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0])
      e.target.value = ''
    },
    [handleFile],
  )

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-[background-color,border-color,box-shadow] duration-200 ease-out',
        'focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-2 dark:focus-within:ring-slate-300 dark:focus-within:ring-offset-slate-950',
        isDisabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-50/50 dark:border-slate-800 dark:bg-slate-900/40'
          : dragOver
            ? 'border-slate-900 bg-slate-50 dark:border-slate-300 dark:bg-slate-800/40'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/60 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-900/40',
        className,
      )}
      aria-disabled={isDisabled || undefined}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        id={inputId}
        type='file'
        className='sr-only'
        accept={accept}
        disabled={isDisabled}
        onChange={handleChange}
      />

      {loading ? (
        <div className='space-y-2'>
          <SpinnerIcon className='mx-auto size-8 animate-spin text-gray-400 dark:text-gray-500' />
          {label && (
            <Text
              as='p'
              size='sm'
              colour='inherit'
              className='text-gray-500 dark:text-gray-400'
            >
              {label}
            </Text>
          )}
        </div>
      ) : (
        <div className='space-y-2'>
          <div
            className={cn(
              'mx-auto flex size-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors duration-200 ease-out group-hover:bg-gray-200 group-hover:text-gray-700 dark:bg-slate-800/80 dark:text-gray-400 dark:group-hover:bg-slate-800 dark:group-hover:text-gray-200',
              dragOver &&
                'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white',
            )}
          >
            <UploadIcon
              className='size-5'
              weight='duotone'
              aria-hidden='true'
            />
          </div>
          {label && (
            <Text as='p' size='sm' weight='medium' colour='primary'>
              {label}
            </Text>
          )}
          {hint && (
            <Text as='p' size='xs' colour='muted'>
              {hint}
            </Text>
          )}
        </div>
      )}
    </label>
  )
}
