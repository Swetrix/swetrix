import { ChevronDownIcon, ChevronUpIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SwetrixErrorDetails } from '~/lib/models/Project'
import Tooltip from '~/ui/Tooltip'
import { getRelativeDateIfPossible } from '~/utils/date'

import { MetricCard } from './MetricCards'

interface ErrorDetailsProps {
  details: SwetrixErrorDetails
}

export const ErrorDetails = ({ details }: ErrorDetailsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  const [isStackTraceExpanded, setIsStackTraceExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const firstSeen = useMemo(() => {
    return getRelativeDateIfPossible(details.first_seen, language)
  }, [details.first_seen, language])

  const lastSeen = useMemo(() => {
    return getRelativeDateIfPossible(details.last_seen, language)
  }, [details.last_seen, language])

  const handleCopyStackTrace = async () => {
    if (!details.stackTrace) return

    try {
      await navigator.clipboard.writeText(details.stackTrace)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy stack trace:', err)
    }
  }

  const formatStackTraceLine = (line: string) => {
    const atMatch = line.match(/(\s*at\s+)([^(]+)(\s*\(([^)]+)\))?/)
    const fileMatch = line.match(/([^:]+):(\d+):(\d+)/)

    if (atMatch) {
      const [, prefix, funcName, , location] = atMatch
      return (
        <p>
          <span className='text-slate-500 dark:text-slate-400'>{prefix}</span>
          <span className='font-medium text-slate-700 dark:text-slate-300'>{funcName}</span>
          {location ? (
            <>
              <span className='text-slate-600 dark:text-slate-400'> (</span>
              <span className='text-slate-800 dark:text-slate-300'>{location}</span>
              <span className='text-slate-600 dark:text-slate-400'>)</span>
            </>
          ) : null}
        </p>
      )
    }

    if (fileMatch) {
      const [, file, lineNum, colNum] = fileMatch
      return (
        <p>
          <span className='text-slate-800 dark:text-slate-300'>{file}</span>
          <span className='text-slate-500 dark:text-slate-400'>:</span>
          <span className='text-slate-600 dark:text-slate-300'>{lineNum}</span>
          <span className='text-slate-500 dark:text-slate-400'>:</span>
          <span className='text-slate-600 dark:text-slate-300'>{colNum}</span>
        </p>
      )
    }

    return <p className='block text-slate-800 dark:text-slate-300'>{line}</p>
  }

  const stackTraceLines = details.stackTrace ? details.stackTrace.split('\n') : []

  return (
    <div className='mb-5'>
      <div className='mb-5 flex flex-wrap justify-center gap-5 lg:justify-start'>
        <div className='flex flex-col'>
          <p className='font-bold text-slate-900 max-md:text-xl md:text-2xl dark:text-gray-50'>{`${details.name}${details.message ? `: ${details.message}` : ''}`}</p>
          <p className='text-sm font-bold text-slate-800 dark:text-gray-200'>
            {t('dashboard.atFile', {
              filename: details.filename ?? 'Unknown file',
              lineno: details.lineno ?? 'N/A',
              colno: details.colno ?? 'N/A',
            })}
          </p>
        </div>

        <MetricCard
          classes={{
            value: 'max-md:text-xl md:text-2xl',
            label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
          }}
          label={t('dashboard.firstSeen')}
          value={details.first_seen || 'N/A'}
          valueMapper={(value) => (
            <Tooltip className='max-w-content !w-full' tooltipNode={<span>{firstSeen}</span>} text={`${value} UTC`} />
          )}
        />

        <MetricCard
          classes={{
            value: 'max-md:text-xl md:text-2xl',
            label: '[&_span]:!text-slate-800 dark:[&_span]:!text-gray-200',
          }}
          label={t('dashboard.lastSeen')}
          value={details.last_seen || 'N/A'}
          valueMapper={(value) => (
            <Tooltip className='max-w-content !w-full' tooltipNode={<span>{lastSeen}</span>} text={`${value} UTC`} />
          )}
        />
      </div>

      {details.stackTrace ? (
        <div className='mb-5'>
          <div className='mb-2 flex items-center justify-between'>
            <button
              onClick={() => setIsStackTraceExpanded(!isStackTraceExpanded)}
              className='flex items-center py-1 text-base font-medium text-slate-900 hover:text-slate-700 dark:text-gray-50 dark:hover:text-gray-200'
            >
              {isStackTraceExpanded ? (
                <ChevronUpIcon className='mr-1 size-4' />
              ) : (
                <ChevronDownIcon className='mr-1 size-4' />
              )}
              {t('project.stackTraceXFrames', { x: stackTraceLines.length })}
            </button>

            {isStackTraceExpanded ? (
              <button
                onClick={handleCopyStackTrace}
                className='relative flex items-center rounded-md border border-gray-50/0 bg-gray-50 p-1 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-white focus:z-10 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-900 dark:text-gray-50 hover:dark:border-slate-700/80 dark:hover:bg-slate-800 focus:dark:ring-gray-200'
              >
                {isCopied ? (
                  <>
                    <CheckIcon className='mr-1 size-4 text-green-500' />
                    {t('project.copied')}
                  </>
                ) : (
                  <>
                    <ClipboardIcon className='mr-1 size-4' />
                    {t('project.copy')}
                  </>
                )}
              </button>
            ) : null}
          </div>

          {isStackTraceExpanded ? (
            <div className='rounded-lg border border-gray-300 bg-white dark:border-slate-800/60 dark:bg-slate-800/25'>
              <div className='max-h-96 overflow-auto p-4'>
                <div className='space-y-1 text-sm leading-relaxed'>
                  {stackTraceLines.map((line, index) => (
                    <div key={index} className='flex'>
                      <span className='mt-0.5 mr-3 inline-block w-8 text-right text-xs text-slate-400 select-none dark:text-slate-500'>
                        {index + 1}
                      </span>
                      <div className='min-w-0 flex-1'>{formatStackTraceLine(line)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
