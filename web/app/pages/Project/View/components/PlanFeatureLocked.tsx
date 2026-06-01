import { LockIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { useProjectFeatureAccess } from '~/hooks/useProjectFeatureAccess'
import type { PlanFeatureCode } from '~/lib/pricing/features'
import Button from '~/ui/Button'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

interface PlanFeatureLockedProps {
  feature: PlanFeatureCode
}

const PlanFeatureLocked = ({ feature }: PlanFeatureLockedProps) => {
  const { t } = useTranslation('common')
  const { isOwner } = useProjectFeatureAccess(feature)
  const audience = isOwner ? 'owner' : 'viewer'

  return (
    <div className='mx-auto w-full max-w-2xl py-16 text-center'>
      <div className='mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-900'>
        <LockIcon
          className='size-7 text-yellow-500 dark:text-yellow-400'
          aria-hidden='true'
        />
      </div>
      <Text as='h3' size='xl' weight='medium' tracking='tight'>
        {t(`project.featureAccess.${feature}.${audience}Title`)}
      </Text>
      <Text
        as='p'
        size='sm'
        colour='secondary'
        className='mx-auto mt-2 max-w-md whitespace-pre-line'
      >
        {t(`project.featureAccess.${audience}Description`)}
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
