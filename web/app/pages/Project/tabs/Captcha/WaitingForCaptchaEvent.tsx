import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useCurrentProject } from '~/providers/CurrentProjectProvider'
import CaptchaSetup from '~/ui/CaptchaSetup'
import PulsatingCircle from '~/ui/icons/PulsatingCircle'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const TROUBLESHOOTING_URL = 'https://swetrix.com/docs/troubleshooting'
const CAPTCHA_INTEGRATION_GUIDE_URL =
  'https://swetrix.com/docs/captcha/client-side-usage'

const WaitingForCaptchaEvent = () => {
  const { t } = useTranslation('common')
  const { id } = useCurrentProject()

  return (
    <div className='mx-auto w-full max-w-2xl py-10'>
      <div className='mb-8 flex gap-5'>
        <div className='mt-1 flex size-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
          <PulsatingCircle type='giant' />
        </div>
        <div>
          <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
            {t('project.waitingCaptcha.title')}
          </Text>
          <Text as='p' size='sm' colour='secondary' className='mt-1'>
            <Trans
              t={t}
              i18nKey='project.waitingCaptcha.desc'
              components={{
                turl: (
                  <a
                    href={TROUBLESHOOTING_URL}
                    className='font-medium underline decoration-dashed hover:decoration-solid'
                    target='_blank'
                    rel='noreferrer noopener'
                  />
                ),
                guideurl: (
                  <a
                    href={CAPTCHA_INTEGRATION_GUIDE_URL}
                    className='font-medium underline decoration-dashed hover:decoration-solid'
                    target='_blank'
                    rel='noreferrer noopener'
                  />
                ),
                curl: (
                  <Link
                    to={routes.contact}
                    className='font-medium underline decoration-dashed hover:decoration-solid'
                  />
                ),
              }}
            />
          </Text>
        </div>
      </div>

      <CaptchaSetup projectId={id} />
    </div>
  )
}

export default WaitingForCaptchaEvent
