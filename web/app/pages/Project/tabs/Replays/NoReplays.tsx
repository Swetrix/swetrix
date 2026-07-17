import {
  CalendarIcon,
  CheckCircleIcon,
  FunnelIcon,
  MonitorPlayIcon,
} from '@phosphor-icons/react'
import _isEmpty from 'lodash/isEmpty'
import { memo } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { V2Filter } from '~/api/v2/types'
import { DOCS_URL } from '~/lib/constants'
import Filters from '~/pages/Project/View/components/Filters'
import { typeNameMapping } from '~/pages/Project/View/ViewProject.helpers'
import { Text } from '~/ui/Text'

const SESSION_REPLAYS_DOCS_URL = `${DOCS_URL}/analytics-dashboard/session-replays`
const setupStepKeys = [
  'project.noReplaysSetupSteps.startRecorder',
  'project.noReplaysSetupSteps.choosePrivacy',
  'project.noReplaysSetupSteps.reviewRecordings',
] as const

interface NoReplaysProps {
  filters: V2Filter[]
  hasReplayData: boolean
}

const NoReplays = ({ filters, hasReplayData }: NoReplaysProps) => {
  const { t } = useTranslation('common')
  const tnMapping = typeNameMapping(t)
  const hasFilters = !_isEmpty(filters)
  const isSetupEmpty = !hasFilters && !hasReplayData

  return (
    <>
      {hasFilters ? <Filters tnMapping={tnMapping} /> : null}
      <div className='mx-auto w-full max-w-2xl py-16 text-center'>
        <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
          {hasFilters ? (
            <FunnelIcon className='size-7 text-gray-700 dark:text-gray-200' />
          ) : isSetupEmpty ? (
            <MonitorPlayIcon className='size-7 text-gray-700 dark:text-gray-200' />
          ) : (
            <CalendarIcon className='size-7 text-gray-700 dark:text-gray-200' />
          )}
        </div>
        <Text as='h3' size='xl' weight='medium' className='tracking-tight'>
          {hasFilters
            ? t('project.noReplaysFiltersTitle')
            : isSetupEmpty
              ? t('project.noReplaysSetupTitle')
              : t('project.noReplaysTitle')}
        </Text>
        <Text
          as='p'
          size='sm'
          colour='secondary'
          className='mx-auto mt-2 max-w-md whitespace-pre-wrap'
        >
          {hasFilters ? (
            t('project.noReplaysFiltersDesc')
          ) : isSetupEmpty ? (
            <Trans
              t={t}
              i18nKey='project.noReplaysSetupDesc'
              components={{
                howto: (
                  <a
                    href={SESSION_REPLAYS_DOCS_URL}
                    aria-label={t('ariaLabels.openSessionReplaysGuide')}
                    className='font-medium underline decoration-dashed hover:decoration-solid'
                    target='_blank'
                    rel='noreferrer noopener'
                  />
                ),
              }}
            />
          ) : (
            t('project.noReplaysContent')
          )}
        </Text>
        {isSetupEmpty ? (
          <ul className='mx-auto mt-6 max-w-md space-y-3 text-left'>
            {setupStepKeys.map((key) => (
              <li key={key} className='flex gap-3'>
                <CheckCircleIcon className='mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400' />
                <Text as='span' size='sm' colour='secondary'>
                  {t(key)}
                </Text>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  )
}

export default memo(NoReplays)
