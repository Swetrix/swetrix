import { useTranslation } from 'react-i18next'

import { DOCS_URL } from '~/lib/constants'
import Tooltip from '~/ui/Tooltip'

interface TeamMembersPricingTooltipProps {
  className?: string
}

const TeamMembersPricingTooltip = ({
  className,
}: TeamMembersPricingTooltipProps) => {
  const { t } = useTranslation('common')

  return (
    <Tooltip
      ariaLabel={`${t('common.learnMore')}: ${t('pricing.comparison.features.teamMembers')}`}
      className={className}
      contentClassName='max-w-[calc(100vw-2rem)] sm:max-w-80'
      text={
        <span className='block space-y-2 text-pretty'>
          <span className='block'>
            {t('pricing.benefits.tooltips.teamMembers.projects')}{' '}
            <a
              href={`${DOCS_URL}/how-to-invite-users-to-your-website`}
              className='font-semibold underline decoration-dashed hover:decoration-solid'
              target='_blank'
              rel='noreferrer noopener'
            >
              {t('common.learnMore')}
            </a>
          </span>
          <span className='block'>
            {t('pricing.benefits.tooltips.teamMembers.organisations')}{' '}
            <a
              href={`${DOCS_URL}/teams-api-integrations#organisations-teams`}
              className='font-semibold underline decoration-dashed hover:decoration-solid'
              target='_blank'
              rel='noreferrer noopener'
            >
              {t('common.learnMore')}
            </a>
          </span>
        </span>
      }
    />
  )
}

export default TeamMembersPricingTooltip
