import { useTranslation } from 'react-i18next'

import { DOCS_URL } from '~/lib/constants'
import Tooltip from '~/ui/Tooltip'

const sessionReplaysDocsUrl = `${DOCS_URL}/analytics-dashboard/session-replays`

interface SessionReplayPricingTooltipProps {
  className?: string
  ariaLabel?: string
}

const SessionReplayPricingTooltipContent = () => {
  const { t } = useTranslation('common')

  return (
    <span className='block space-y-2 text-pretty'>
      <span className='block'>
        {t('pricing.benefits.tooltips.sessionReplays.description')}
      </span>
      <span className='block'>
        {t('pricing.benefits.tooltips.sessionReplays.recording')}
      </span>
      <span className='block'>
        {t('pricing.benefits.tooltips.sessionReplays.quota')}
      </span>
      <span className='block'>
        {t('pricing.benefits.tooltips.sessionReplays.plans')}
      </span>
      <a
        href={sessionReplaysDocsUrl}
        className='inline-flex font-semibold underline decoration-dashed hover:decoration-solid'
        target='_blank'
        rel='noreferrer noopener'
      >
        {t('common.learnMore')}
      </a>
    </span>
  )
}

const SessionReplayPricingTooltip = ({
  className,
  ariaLabel,
}: SessionReplayPricingTooltipProps) => {
  const { t } = useTranslation('common')
  const label = t('pricing.benefits.sessionReplays')

  return (
    <Tooltip
      ariaLabel={ariaLabel || `${t('common.learnMore')}: ${label}`}
      text={<SessionReplayPricingTooltipContent />}
      className={className}
      contentClassName='max-w-[calc(100vw-2rem)] sm:max-w-80'
    />
  )
}

export default SessionReplayPricingTooltip
