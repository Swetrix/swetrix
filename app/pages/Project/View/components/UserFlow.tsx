import React, { useEffect, useState, useMemo } from 'react'
// import { ResponsiveSankey } from '@nivo/sankey'
import { connect } from 'react-redux'
import { StateType, AppDispatch } from 'redux/store'
import UIActions from 'redux/reducers/ui'
import { errorsActions } from 'redux/reducers/errors'
import { IUserFlow } from 'redux/models/IUserFlow'
import _isEmpty from 'lodash/isEmpty'
import { getUserFlowCacheKey, PROJECTS_PROTECTED } from 'redux/constants'
import { getUserFlow } from 'api'
import { getItem } from 'utils/localstorage'
import Loader from 'ui/Loader'

const mapStateToProps = (state: StateType) => ({
  userFlowAscendingCache: state.ui.cache.userFlowAscending,
  userFlowDescendingCache: state.ui.cache.userFlowDescending,
  password: state.ui.projects.password,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  setUserFlowAscending: (data: IUserFlow, pid: string, period: string, filters: any) => {
    dispatch(UIActions.setUserFlowAscending({
      data,
      pid,
      period,
      filters,
    }))
  },
  setUserFlowDescending: (data: IUserFlow, pid: string, period: string, filters: any) => {
    dispatch(UIActions.setUserFlowDescending({
      data,
      pid,
      period,
      filters,
    }))
  },
  generateError: (message: string) => {
    dispatch(errorsActions.genericError({
      message,
    }))
  },
})

const UserFlow = ({
  disableLegend, pid, period, timeBucket, from, to, timezone, userFlowAscendingCache,
  userFlowDescendingCache, filters, setReversed,
  isReversed, setUserFlowAscending, setUserFlowDescending, generateError, t,
  password,
}: {
  disableLegend?: boolean
  pid: string
  userFlowAscendingCache: {
    [key: string]: IUserFlow
  }
  userFlowDescendingCache: {
    [key: string]: IUserFlow
  }
  period: string
  timezone: string
  timeBucket: string
  from: string
  to: string
  isReversed?: boolean
  setUserFlowAscending: (data: IUserFlow, id: string, pd: string, fltr: any) => void
  setUserFlowDescending: (data: IUserFlow, id: string, pd: string, fltr: any) => void
  generateError: (message: string) => void
  t: (key: string) => string
  filters: string[]
  setReversed: () => void
  password: {
    [key: string]: string
  }
}) => {
  const key = getUserFlowCacheKey(pid, period, filters)
  const userFlowAscending = userFlowAscendingCache[key]
  const userFlowDescending = userFlowDescendingCache[key]
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const projectPassword: string = useMemo(() => password[pid] || getItem(PROJECTS_PROTECTED)?.[pid] || '', [pid, password])

  const fetchUserFlow = async () => {
    setIsLoading(true)
    await getUserFlow(pid, timeBucket, period, filters, from, to, timezone, projectPassword)
      .then((res: {
        ascending: IUserFlow
        descending: IUserFlow
      }) => {
        const { ascending, descending } = res

        setUserFlowAscending(ascending, pid, period, filters)
        setUserFlowDescending(descending, pid, period, filters)
      })
      .catch((err: Error) => {
        generateError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    if (_isEmpty(userFlowAscending) && _isEmpty(userFlowDescending)) {
      fetchUserFlow()
    } else if (isLoading) {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, timeBucket, from, to, timezone, pid])

  useEffect(() => {
    fetchUserFlow()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  if (isLoading) {
    return <Loader />
  }

  if (!isReversed ? (_isEmpty(userFlowAscending) || _isEmpty(userFlowAscending?.nodes) || _isEmpty(userFlowAscending?.links)) : (_isEmpty(userFlowDescending) || _isEmpty(userFlowDescending?.links) || _isEmpty(userFlowDescending?.nodes))) {
    return (
      <>
        <p className='flex mt-4 items-center justify-center text-md text-gray-900 dark:text-gray-50'>
          {t('project.userFlow.noData')}
        </p>
        <button
          type='button'
          onClick={() => {
            setReversed()
          }}
          className='mt-2 w-full inline-flex justify-center rounded-md dark:border-none border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-50 dark:border-gray-600 dark:bg-slate-700 dark:hover:border-gray-600 dark:hover:bg-gray-700 sm:w-auto sm:text-sm'
        >
          {t('project.reverse')}
        </button>

      </>
    )
  }

  return null
    // <ResponsiveSankey
    //   // @ts-ignore
    //   data={isReversed ? userFlowDescending : userFlowAscending}
    //   margin={{
    //     top: 0,
    //     // right: disableLegend ? 0 : 120,
    //     right: 0,
    //     bottom: 0,
    //     left: 20,
    //   }}
    //   align='justify'
    //   colors={{ scheme: 'nivo' }}
    //   nodeOpacity={1}
    //   nodeHoverOthersOpacity={0.35}
    //   nodeThickness={18}
    //   nodeSpacing={24}
    //   nodeBorderWidth={0}
    //   nodeBorderColor={{
    //     from: 'color',
    //     modifiers: [
    //       [
    //         'darker',
    //         0.8,
    //       ],
    //     ],
    //   }}
    //   nodeBorderRadius={3}
    //   linkOpacity={0.5}
    //   linkHoverOthersOpacity={0.1}
    //   linkContract={3}
    //   enableLinkGradient
    //   labelPosition='outside'
    //   labelOrientation='vertical'
    //   labelPadding={16}
    //   labelTextColor={{
    //     from: 'color',
    //     modifiers: [
    //       [
    //         'darker',
    //         1,
    //       ],
    //     ],
    //   }}
    //   // legends={!disableLegend ? [
    //   //   {
    //   //     anchor: 'bottom-right',
    //   //     direction: 'column',
    //   //     translateX: 100,
    //   //     itemWidth: 100,
    //   //     itemHeight: 14,
    //   //     itemDirection: 'right-to-left',
    //   //     itemsSpacing: 2,
    //   //     itemTextColor: '#999',
    //   //     symbolSize: 14,
    //   //     effects: [
    //   //       {
    //   //         on: 'hover',
    //   //         style: {
    //   //           itemTextColor: '#000',
    //   //         },
    //   //       },
    //   //     ],
    //   //   },
    //   // ] : []}
    // />
  // )
}

UserFlow.defaultProps = {
  disableLegend: false,
  isReversed: false,
}

const mergeProps = (stateProps: ReturnType<typeof mapStateToProps>, dispatchProps: ReturnType<typeof mapDispatchToProps>, ownProps: ReturnType<typeof UserFlow>) => ({
  ...ownProps,
  ...stateProps,
  ...dispatchProps,
})

export default connect(mapStateToProps, mapDispatchToProps, mergeProps)(UserFlow)
