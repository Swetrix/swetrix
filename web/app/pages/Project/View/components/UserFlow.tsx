import { useEffect, useState, memo, useMemo } from 'react'
import { toast } from 'sonner'
import { ResponsiveSankey } from '@nivo/sankey'
import { UserFlowType } from '~/lib/models/UserFlow'
import _isEmpty from 'lodash/isEmpty'
import { getUserFlow } from '~/api'
import Loader from '~/ui/Loader'
import { useTranslation } from 'react-i18next'
import { useViewProjectContext } from '../ViewProject'
import { getFormatDate } from '../ViewProject.helpers'

interface UserFlowProps {
  isReversed?: boolean
  setReversed: () => void
}

const UserFlow = ({ setReversed, isReversed }: UserFlowProps) => {
  const { dateRange, period, timeBucket, timezone, projectPassword, projectId, filters } = useViewProjectContext()
  const { t } = useTranslation('common')
  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [userFlow, setUserFlow] = useState<{
    ascending: UserFlowType
    descending: UserFlowType
  } | null>(null)

  const [from, to] = useMemo(() => {
    if (!dateRange) {
      return [undefined, undefined]
    }

    return [getFormatDate(dateRange[0]), getFormatDate(dateRange[1])]
  }, [dateRange])

  const fetchUserFlow = async () => {
    if (isLoading) {
      return
    }

    setIsLoading(true)

    try {
      const { ascending, descending } = await getUserFlow(
        projectId,
        timeBucket,
        period,
        filters,
        from,
        to,
        timezone,
        projectPassword,
      )
      setUserFlow({ ascending, descending })
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : t('apiNotifications.somethingWentWrong'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserFlow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, period, timeBucket, from, to, timezone, projectId])

  if (isLoading || isLoading === null) {
    return <Loader />
  }

  if (
    !isReversed
      ? _isEmpty(userFlow?.ascending) || _isEmpty(userFlow?.ascending?.nodes) || _isEmpty(userFlow?.ascending?.links)
      : _isEmpty(userFlow?.descending) || _isEmpty(userFlow?.descending?.links) || _isEmpty(userFlow?.descending?.nodes)
  ) {
    return (
      <>
        <p className='text-md mt-4 flex items-center justify-center text-gray-900 dark:text-gray-50'>
          {t('project.userFlow.noData')}
        </p>
        <button
          type='button'
          onClick={() => {
            setReversed()
          }}
          className='mt-2 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 sm:w-auto sm:text-sm dark:border-none dark:border-gray-600 dark:bg-slate-700 dark:text-gray-50 dark:hover:border-gray-600 dark:hover:bg-gray-700'
        >
          {t('project.reverse')}
        </button>
      </>
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
