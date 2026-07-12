import { ResponsiveSankey } from '@nivo/sankey'
import { ArrowClockwiseIcon, TreeStructureIcon } from '@phosphor-icons/react'
import _isEmpty from 'lodash/isEmpty'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { useUserFlowQuery } from '~/hooks/v2/useV2Queries'
import { PanelEmptyState } from '~/pages/Project/View/Panels'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import { Text } from '~/ui/Text'

interface UserFlowProps {
  isReversed?: boolean
  setReversed: () => void
}

const UserFlow = ({ setReversed, isReversed }: UserFlowProps) => {
  const { t } = useTranslation('common')
  const { data, isLoading } = useUserFlowQuery()
  const userFlow = data?.data

  if (isLoading) {
    return <Loader />
  }

  if (
    !isReversed
      ? _isEmpty(userFlow?.ascending) ||
        _isEmpty(userFlow?.ascending?.nodes) ||
        _isEmpty(userFlow?.ascending?.links)
      : _isEmpty(userFlow?.descending) ||
        _isEmpty(userFlow?.descending?.links) ||
        _isEmpty(userFlow?.descending?.nodes)
  ) {
    return (
      <PanelEmptyState
        icon={
          <TreeStructureIcon className='size-5 text-gray-400 dark:text-slate-500' />
        }
      >
        <Text as='p' size='sm' colour='secondary'>
          {t('project.userFlow.noData')}
        </Text>
        <Button
          variant='icon'
          type='button'
          onClick={() => {
            setReversed()
          }}
          className='mt-3 gap-1.5 px-3 py-2'
          aria-label={t('project.reverse')}
        >
          <ArrowClockwiseIcon className='size-4' />
          {t('project.reverse')}
        </Button>
      </PanelEmptyState>
    )
  }

  return (
    <ResponsiveSankey
      // @ts-expect-error
      data={isReversed ? userFlow?.descending : userFlow?.ascending}
      margin={{
        top: 0,
        right: 0,
        bottom: 0,
        left: 20,
      }}
      align='justify'
      colors={{ scheme: 'nivo' }}
      nodeOpacity={1}
      nodeHoverOthersOpacity={0.35}
      nodeThickness={18}
      nodeSpacing={24}
      nodeBorderWidth={0}
      nodeBorderColor={{
        from: 'color',
        modifiers: [['darker', 0.8]],
      }}
      nodeBorderRadius={3}
      linkOpacity={0.5}
      linkHoverOthersOpacity={0.1}
      linkContract={3}
      enableLinkGradient
      labelPosition='outside'
      labelOrientation='vertical'
      labelPadding={16}
      labelTextColor={{
        from: 'color',
        modifiers: [['darker', 1]],
      }}
    />
  )
}

export default memo(UserFlow)
