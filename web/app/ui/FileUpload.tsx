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
        'group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        isDisabled
          ? 'cursor-not-allowed border-gray-200 dark:border-slate-700'
          : dragOver
            ? 'border-slate-900 bg-gray-50 dark:border-slate-400 dark:bg-slate-800/50'
            : 'border-gray-300 hover:border-gray-400 dark:border-slate-600 dark:hover:border-slate-500',
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
          <SpinnerIcon className='mx-auto size-8 animate-spin text-gray-400' />
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
          <UploadIcon className='mx-auto size-8 text-gray-400 dark:text-gray-500' />
          {label && (
            <Text as='p' size='sm' colour='inherit'>
              {label}
            </Text>
          )}
          {hint && (
            <Text
              as='p'
              size='xs'
              colour='inherit'
              className='text-gray-500 dark:text-gray-400'
            >
              {hint}
            </Text>
          )}
        </div>
      )}
    </label>
  )
}
