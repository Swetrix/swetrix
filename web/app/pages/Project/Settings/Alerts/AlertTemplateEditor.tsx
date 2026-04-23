import { CodeIcon, EyeIcon } from '@phosphor-icons/react'
import { marked } from 'marked'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import sanitizeHtml from 'sanitize-html'

import type { ProjectViewActionData } from '~/routes/projects.$id'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import Textarea from '~/ui/Textarea'

interface TemplateVariablesResponse {
  variables: string[]
  defaultTemplate: string
}

type AlertTemplateSampleValues = Partial<
  Record<string, string | number | null | undefined>
>

interface AlertTemplateEditorProps {
  projectId: string
  metric: string
  body: string
  subject: string
  onBodyChange: (body: string) => void
  onSubjectChange: (subject: string) => void
  showSubject: boolean
  sampleValues?: AlertTemplateSampleValues
}

const PLACEHOLDER_DEFAULTS: Record<string, string | number> = {
  alert_name: 'High traffic alert',
  project_name: 'My website',
  project_id: 'abcdef',
  dashboard_url: 'https://swetrix.com/projects/abcdef',
  value: 1234,
  threshold: 1000,
  condition: 'greater than',
  time_window: 'last 1 hour',
  error_count: 3,
  error_message: 'Cannot read properties of undefined',
  error_name: 'TypeError',
  errors_url: 'https://swetrix.com/projects/abcdef?tab=errors',
  is_new_only: 'yes',
  event_name: 'signup',
  event_count: 17,
  every_event_mode: 'no',
  views: 4321,
  unique_views: 2100,
  online_count: 42,
}

const buildSampleContext = (
  variables: string[],
  overrides: AlertTemplateSampleValues = {},
): Record<string, string | number> => {
  const sample: Record<string, string | number> = { ...PLACEHOLDER_DEFAULTS }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null || value === '') continue
    sample[key] = value as string | number
  }
  for (const name of variables) {
    if (sample[name] === undefined) sample[name] = `<${name}>`
  }
  return sample
}

const interpolate = (
  template: string,
  sample: Record<string, string | number>,
): string => {
  if (!template) return ''
  return template.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, name) => {
    return sample[name] !== undefined ? String(sample[name]) : `{{${name}}}`
  })
}

marked.setOptions({ breaks: true, gfm: true })

// Channels like Telegram/Slack treat single `*text*` as bold (not italic).
// Convert it to CommonMark-compatible `**text**` so the live preview matches
// what end-users will actually see in the destination channel.
const normalizeChannelMarkdown = (input: string): string =>
  input.replace(
    /(^|[^*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\*)/g,
    (_, prefix, content) => `${prefix}**${content}**`,
  )

const renderMarkdown = (markdown: string): string => {
  const html = marked.parse(normalizeChannelMarkdown(markdown)) as string
  return sanitizeHtml(html, {
    allowedTags: [
      'a',
      'b',
      'strong',
      'i',
      'em',
      'u',
      's',
      'del',
      'code',
      'pre',
      'br',
      'p',
      'ul',
      'ol',
      'li',
      'blockquote',
      'hr',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'span',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      code: ['class'],
      pre: ['class'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      }),
    },
  })
}

const AlertTemplateEditor = ({
  projectId,
  metric,
  body,
  subject,
  onBodyChange,
  onSubjectChange,
  showSubject,
  sampleValues,
}: AlertTemplateEditorProps) => {
  const { t } = useTranslation('common')
  const fetcher = useFetcher<ProjectViewActionData>()
  const lastIntent = useRef<string | null>(null)
  const [variables, setVariables] = useState<string[]>([])
  const [defaultTemplate, setDefaultTemplate] = useState<string>('')
  const [showPreview, setShowPreview] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!metric) return
    const fd = new FormData()
    fd.set('intent', 'get-alert-template-variables')
    fd.set('metric', metric)
    fetcher.submit(fd, {
      method: 'POST',
      action: `/projects/${projectId}`,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, projectId])

  useEffect(() => {
    if (
      fetcher.state !== 'idle' ||
      !fetcher.data ||
      fetcher.data.intent !== 'get-alert-template-variables'
    )
      return
    if (lastIntent.current === fetcher.data.intent + metric) return
    lastIntent.current = fetcher.data.intent + metric
    if (fetcher.data.success && fetcher.data.data) {
      const payload = fetcher.data.data as TemplateVariablesResponse
      setVariables(payload.variables || [])
      setDefaultTemplate(payload.defaultTemplate || '')
    }
  }, [fetcher.state, fetcher.data, metric])

  const insertAtCursor = (token: string) => {
    const ta = bodyRef.current
    if (!ta) {
      onBodyChange((body || '') + token)
      return
    }
    const start = ta.selectionStart ?? body.length
    const end = ta.selectionEnd ?? body.length
    const next = body.slice(0, start) + token + body.slice(end)
    onBodyChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + token.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const sample = useMemo(
    () => buildSampleContext(variables, sampleValues),
    [variables, sampleValues],
  )

  const previewBodyHtml = useMemo(
    () => renderMarkdown(interpolate(body || defaultTemplate || '', sample)),
    [body, defaultTemplate, sample],
  )
  const previewSubject = useMemo(
    () => interpolate(subject, sample),
    [subject, sample],
  )

  return (
    <div className='mt-6 rounded-lg border border-gray-200 p-4 dark:border-slate-800'>
      <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <Text as='h3' size='base' weight='bold'>
            {t('alert.template.heading')}
          </Text>
          <Text as='p' size='sm' colour='secondary' className='mt-0.5'>
            {t('alert.template.description')}
          </Text>
        </div>
        <button
          type='button'
          className='inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? (
            <CodeIcon className='size-3.5' aria-hidden />
          ) : (
            <EyeIcon className='size-3.5' aria-hidden />
          )}
          {showPreview
            ? t('alert.template.editMode')
            : t('alert.template.previewMode')}
        </button>
      </div>

      {showSubject ? (
        <div className='mt-4'>
          <Input
            label={t('alert.template.emailSubject')}
            placeholder={t('alert.template.emailSubjectPlaceholder')}
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
          />
        </div>
      ) : null}

      {!showPreview ? (
        <>
          <div className='mt-4'>
            <Textarea
              ref={bodyRef as any}
              label={t('alert.template.body')}
              rows={6}
              value={body}
              placeholder={defaultTemplate || ''}
              onChange={(e) => onBodyChange(e.target.value)}
              hint={t('alert.template.bodyHint')}
            />
          </div>

          {variables.length > 0 ? (
            <div className='mt-3'>
              <Text as='p' size='sm' weight='medium'>
                {t('alert.template.insertVariable')}
              </Text>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {variables.map((name) => (
                  <button
                    type='button'
                    key={name}
                    onClick={() => insertAtCursor(`{{${name}}}`)}
                    title={name}
                    className='inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800'
                  >
                    {`{{${name}}}`}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className='mt-4 space-y-3'>
          {showSubject && previewSubject ? (
            <div>
              <Text as='p' size='sm' weight='medium' className='mb-1'>
                {t('alert.template.emailSubject')}
              </Text>
              <div className='rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900'>
                {previewSubject}
              </div>
            </div>
          ) : null}
          <div>
            <Text as='p' size='sm' weight='medium' className='mb-1'>
              {t('alert.template.preview')}
            </Text>
            <div
              className='alert-preview prose prose-sm max-w-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:prose-invert [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0'
              dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default AlertTemplateEditor
