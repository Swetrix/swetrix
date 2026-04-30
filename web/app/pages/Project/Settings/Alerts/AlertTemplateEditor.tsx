import { CodeIcon, EyeIcon, PlusIcon } from '@phosphor-icons/react'
import { Marked } from 'marked'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import sanitizeHtml from 'sanitize-html'

import type { ProjectViewActionData } from '~/routes/projects.$id'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'

import RichTemplateInput, {
  type TemplateVariableInfo,
} from './RichTemplateInput'

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

const markdownParser = new Marked({ breaks: true, gfm: true })

// Channels like Telegram/Slack treat single `*text*` as bold (not italic).
// Convert it to CommonMark-compatible `**text**` so the live preview matches
// what end-users will actually see in the destination channel.
const normalizeChannelMarkdown = (input: string): string =>
  input.replace(
    /(^|[^*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\*)/g,
    (_, prefix, content) => `${prefix}**${content}**`,
  )

const renderMarkdown = (markdown: string): string => {
  const html = markdownParser.parse(
    normalizeChannelMarkdown(markdown),
  ) as string
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

  const variableInfos = useMemo<TemplateVariableInfo[]>(
    () =>
      variables.map((name) => {
        const key = `alert.template.variables.${name}` as const
        const translated = t(key as any)
        return {
          name,
          description:
            translated && translated !== key ? translated : undefined,
        }
      }),
    [variables, t],
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
        <Button
          variant='secondary'
          size='xs'
          onClick={() => setShowPreview((v) => !v)}
          className='self-start sm:self-auto'
        >
          <span className='inline-flex items-center gap-1'>
            {showPreview ? (
              <CodeIcon className='size-3.5' aria-hidden />
            ) : (
              <EyeIcon className='size-3.5' aria-hidden />
            )}
            {showPreview
              ? t('alert.template.editMode')
              : t('alert.template.previewMode')}
          </span>
        </Button>
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
            <RichTemplateInput
              ref={bodyRef as any}
              label={t('alert.template.body')}
              rows={7}
              value={body}
              placeholder={defaultTemplate || ''}
              onChange={onBodyChange}
              variables={variableInfos}
              hint={t('alert.template.bodyHint')}
            />
          </div>

          {variableInfos.length > 0 ? (
            <div className='mt-4'>
              <Text
                as='p'
                size='xs'
                weight='semibold'
                colour='secondary'
                className='tracking-wider uppercase'
              >
                {t('alert.template.insertVariable')}
              </Text>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {variableInfos.map((variable) => (
                  <button
                    type='button'
                    key={variable.name}
                    onClick={() => insertAtCursor(`{{${variable.name}}}`)}
                    title={variable.description || variable.name}
                    className='group inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] text-indigo-700 ring-1 ring-indigo-100 transition-all hover:bg-indigo-100 hover:ring-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-400/20 dark:hover:bg-indigo-500/25'
                  >
                    <PlusIcon
                      className='size-3 opacity-60 transition-opacity group-hover:opacity-100'
                      aria-hidden
                    />
                    {variable.name}
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
              <div className='rounded-md bg-gray-50 px-3 py-2 text-sm ring-1 ring-gray-300 ring-inset dark:bg-slate-900 dark:ring-slate-700/80'>
                {previewSubject}
              </div>
            </div>
          ) : null}
          <div>
            <Text as='p' size='sm' weight='medium' className='mb-1'>
              {t('alert.template.preview')}
            </Text>
            <div
              className='alert-preview prose prose-sm max-w-none rounded-md bg-gray-50 px-3 py-2 text-sm ring-1 ring-gray-300 ring-inset dark:bg-slate-900 dark:ring-slate-700/80 dark:prose-invert [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0'
              dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default AlertTemplateEditor
