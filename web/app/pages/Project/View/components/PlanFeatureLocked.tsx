import { LockIcon } from '@phosphor-icons/react'
import { Trans, useTranslation } from 'react-i18next'

import { useProjectFeatureAccess } from '~/hooks/useProjectFeatureAccess'
import { DOCS_URL } from '~/lib/constants'
import type { PlanFeatureCode } from '~/lib/pricing/features'
import Button from '~/ui/Button'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

interface PlanFeatureLockedProps {
  feature: PlanFeatureCode
}

const allowedFeatures = ['featureFlags', 'experiments', 'replays'] as const
const featureDocsUrls: Record<(typeof allowedFeatures)[number], string> = {
  featureFlags: `${DOCS_URL}/analytics-dashboard/feature-flags`,
  experiments: `${DOCS_URL}/analytics-dashboard/experiments`,
  replays: `${DOCS_URL}/analytics-dashboard/session-replays`,
}
const featureDocsAriaLabels: Record<(typeof allowedFeatures)[number], string> =
  {
    featureFlags: 'ariaLabels.openFeatureFlagsGuide',
    experiments: 'ariaLabels.openExperimentsGuide',
    replays: 'ariaLabels.openSessionReplaysGuide',
  }

const PlanFeatureLocked = ({ feature }: PlanFeatureLockedProps) => {
  const { t } = useTranslation('common')
  const safeFeature = allowedFeatures.includes(feature) ? feature : null
  const { isOwner } = useProjectFeatureAccess(safeFeature || 'featureFlags')
  const audience = isOwner ? 'owner' : 'viewer'

  if (!safeFeature) {
    return null
  }

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
        <LockIcon
          className='size-7 text-yellow-500 dark:text-yellow-400'
          aria-hidden='true'
        />
      </div>
      <Text as='h3' size='xl' weight='medium' tracking='tight'>
        {t(`project.featureAccess.${safeFeature}.${audience}Title`)}
      </Text>
      <Text
        as='p'
        size='sm'
        colour='secondary'
        className='mx-auto mt-2 max-w-md'
      >
        {t(`project.featureAccess.${audience}Description`)}
      </Text>
      <Text
        as='p'
        size='sm'
        colour='secondary'
        className='mx-auto mt-3 max-w-md'
      >
        <Trans
          t={t}
          i18nKey={`project.featureAccess.${safeFeature}.description`}
          components={{
            docs: (
              <a
                href={featureDocsUrls[safeFeature]}
                aria-label={t(featureDocsAriaLabels[safeFeature])}
                className='font-medium underline decoration-dashed hover:decoration-solid'
                target='_blank'
                rel='noreferrer noopener'
              />
            ),
          }}
        />
      </Text>
      {isOwner ? (
        <div className='mt-6 flex justify-center'>
          <Button to={routes.billing_choose_plan}>
            {t('project.featureAccess.upgradePlan')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default PlanFeatureLocked
