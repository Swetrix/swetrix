import { useCallback, useId, useRef, useState } from 'react'
import { UploadIcon, SpinnerIcon } from '@phosphor-icons/react'

import { cn } from '~/utils/generic'

import { Text } from './Text'

interface FileUploadProps {
  accept?: string
  disabled?: boolean
  loading?: boolean
  variant?: 'regular' | 'mini'
  multiple?: boolean
  onFile: (file: File) => void
  onFiles?: (files: File[]) => void
  label?: React.ReactNode
  hint?: React.ReactNode
  className?: string
}

export default function FileUpload({
  accept,
  disabled,
  loading,
  variant = 'regular',
  multiple,
  onFile,
  onFiles,
  label,
  hint,
  className,
}: FileUploadProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const isDisabled = disabled || loading
  const isMini = variant === 'mini'
  const hintId = `${inputId}-hint`
  const showHint = Boolean(hint && !loading)

  const handleFiles = useCallback(
    (files: FileList | File[] | null | undefined) => {
      if (!files || isDisabled) return

      const selectedFiles = Array.from(files)
      if (!selectedFiles.length) return

      if (multiple) {
        if (onFiles) {
          onFiles(selectedFiles)
          return
        }

        selectedFiles.forEach(onFile)
        return
      }

      onFile(selectedFiles[0])
    },
    [isDisabled, multiple, onFile, onFiles],
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
      handleFiles(e.dataTransfer.files)
    },
    [isDisabled, handleFiles],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      e.target.value = ''
    },
    [handleFiles],
  )

  return (
    <div className='flex flex-col gap-1'>
      {showHint ? (
        <Text
          as='span'
          id={hintId}
          className='block leading-tight whitespace-pre-line'
          size='sm'
          colour='secondary'
        >
          {hint}
        </Text>
      ) : null}
      <label
        htmlFor={inputId}
        className={cn(
          'group relative flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-[background-color,border-color,box-shadow] duration-200 ease-out',
          'focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-2 dark:focus-within:ring-slate-300 dark:focus-within:ring-offset-slate-950',
          isMini ? 'flex-row gap-3 p-3 text-left' : 'flex-col p-6 text-center',
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
          multiple={multiple}
          disabled={isDisabled}
          aria-describedby={showHint ? hintId : undefined}
          onChange={handleChange}
        />

        {loading ? (
          <div
            className={cn(
              isMini
                ? 'flex min-w-0 items-center gap-3'
                : 'space-y-2 text-center',
            )}
          >
            <SpinnerIcon
              className={cn(
                'animate-spin text-gray-400 dark:text-gray-500',
                isMini ? 'size-5 shrink-0' : 'mx-auto size-8',
              )}
            />
            {label && (
              <Text
                as='p'
                size='sm'
                colour='inherit'
                className='min-w-0 text-gray-500 dark:text-gray-400'
              >
                {label}
              </Text>
            )}
          </div>
        ) : (
          <div
            className={cn(
              isMini
                ? 'flex min-w-0 items-center gap-3'
                : 'space-y-2 text-center',
            )}
          >
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors duration-200 ease-out dark:bg-slate-800/80 dark:text-gray-400',
                isMini ? 'size-8' : 'mx-auto size-10',
                !isDisabled &&
                  'group-hover:bg-gray-200 group-hover:text-gray-700 dark:group-hover:bg-slate-800 dark:group-hover:text-gray-200',
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
          </div>
        )}
      </label>
    </div>
  )
}
