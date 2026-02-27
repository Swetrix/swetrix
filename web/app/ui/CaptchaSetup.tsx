import { CodeIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { Badge } from '~/ui/Badge'
import CodeBlock from '~/ui/CodeBlock'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

type CaptchaTab = 'script' | 'validation'

const CAPTCHA_TABS: {
  id: CaptchaTab
  labelKey: string
  icon: React.ElementType
}[] = [
  {
    id: 'script',
    labelKey: 'project.waitingCaptcha.setup.tabs.script',
    icon: CodeIcon,
  },
  {
    id: 'validation',
    labelKey: 'project.waitingCaptcha.setup.tabs.validation',
    icon: ShieldCheckIcon,
  },
]

const CAPTCHA_DOCS_URL = 'https://swetrix.com/docs/captcha/client-side-usage'
const CAPTCHA_VALIDATION_DOCS_URL =
  'https://swetrix.com/docs/captcha/server-side-validation'

const getLoaderSnippet = () =>
  '<script src="https://cdn.swetrixcaptcha.com/captcha-loader.js" defer></script>'

const getWidgetSnippet = (pid: string) =>
  `<div class="swecaptcha" data-project-id="${pid}"></div>`

const getValidationSnippet = () =>
  `const response = await fetch('https://api.swetrixcaptcha.com/v1/captcha/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret: 'YOUR_SECRET_KEY',
    response: captchaToken,
  }),
})

const { success } = await response.json()`

interface CaptchaSetupProps {
  projectId: string
}

const CaptchaSetup = ({ projectId }: CaptchaSetupProps) => {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState<CaptchaTab>('script')

  return (
    <div>
      <div className='mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-900'>
        {CAPTCHA_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all',
                isActive
                  ? 'bg-white text-gray-900 ring-1 ring-gray-200 ring-inset dark:bg-slate-800 dark:text-gray-100 dark:ring-slate-800'
                  : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              <Icon
                className='size-4 shrink-0'
                weight={isActive ? 'bold' : 'regular'}
              />
              <span className='hidden sm:inline'>{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>

      <div className='rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-950'>
        {activeTab === 'script' && (
          <div>
            <div className='mb-4 flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700'>
                <CodeIcon className='size-5 text-gray-700 dark:text-gray-200' />
              </div>
              <div>
                <Text as='h3' size='sm' weight='semibold'>
                  {t('project.waitingCaptcha.setup.script.title')}
                </Text>
                <Text as='p' size='xs' colour='secondary'>
                  {t('project.waitingCaptcha.setup.script.desc')}
                </Text>
              </div>
            </div>

            <div className='space-y-4'>
              <div>
                <Text as='p' size='xs' weight='semibold' className='mb-2'>
                  <Trans
                    t={t}
                    i18nKey='project.waitingCaptcha.setup.script.step1'
                    components={{
                      headTag: <Badge label='<head>' colour='slate' />,
                    }}
                  />
                </Text>
                <CodeBlock code={getLoaderSnippet()} />
              </div>
              <div>
                <Text as='p' size='xs' weight='semibold' className='mb-2'>
                  {t('project.waitingCaptcha.setup.script.step2')}
                </Text>
                <CodeBlock code={getWidgetSnippet(projectId)} />
              </div>
            </div>

            <Text as='p' size='xs' colour='secondary' className='mt-4'>
              <Trans
                t={t}
                i18nKey='project.waitingCaptcha.setup.script.docsHint'
                components={{
                  url: (
                    <a
                      href={CAPTCHA_DOCS_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='font-medium underline decoration-dashed hover:decoration-solid'
                    />
                  ),
                }}
              />
            </Text>
          </div>
        )}

        {activeTab === 'validation' && (
          <div>
            <div className='mb-4 flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700'>
                <ShieldCheckIcon className='size-5 text-gray-700 dark:text-gray-200' />
              </div>
              <div>
                <Text as='h3' size='sm' weight='semibold'>
                  {t('project.waitingCaptcha.setup.validation.title')}
                </Text>
                <Text as='p' size='xs' colour='secondary'>
                  {t('project.waitingCaptcha.setup.validation.desc')}
                </Text>
              </div>
            </div>

            <div className='space-y-4'>
              <div>
                <Text as='p' size='xs' weight='semibold' className='mb-2'>
                  {t('project.waitingCaptcha.setup.validation.step1')}
                </Text>
                <CodeBlock code={getValidationSnippet()} />
              </div>
            </div>

            <Text as='p' size='xs' colour='secondary' className='mt-4'>
              <Trans
                t={t}
                i18nKey='project.waitingCaptcha.setup.validation.docsHint'
                components={{
                  url: (
                    <a
                      href={CAPTCHA_VALIDATION_DOCS_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='font-medium underline decoration-dashed hover:decoration-solid'
                    />
                  ),
                }}
              />
            </Text>
          </div>
        )}
      </div>
    </div>
  )
}

export default CaptchaSetup
