import React, { useState, useEffect, memo } from 'react'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/solid'
import _split from 'lodash/split'

import Title from 'components/Title'
import UIActions from 'redux/actions/ui'
import Loader from 'ui/Loader'

const ConfirmShare = () => {
  const { t } = useTranslation('common')
  const dispatch = useDispatch()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const path = _split(window.location.pathname, '/')[1]

    dispatch(
      UIActions.shareVerifyAsync(
        { path, id },
        () => setLoading(false),
        (verifyError) => {
          setError(verifyError)
          setLoading(false)
        },
      ),
    )
  }, [id]) // eslint-disable-line

  if (loading) {
    return (
      <Title title={t('titles.invitation')}>
        <div className='min-h-page bg-gray-50 dark:bg-gray-800'>
          <Loader />
        </div>
      </Title>
    )
  }

  if (error) {
    return (
      <Title title={t('titles.invitation')}>
        <div className='min-h-page bg-gray-50 dark:bg-gray-800'>
          <div className='flex justify-center pt-10'>
            <div className='rounded-md p-4 w-11/12 bg-red-50 lg:w-4/6'>
              <div className='flex'>
                <div className='flex-shrink-0'>
                  <XCircleIcon className='h-5 w-5 text-red-400' aria-hidden='true' />
                </div>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-red-800 dark:text-red-500'>{error}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Title>
    )
  }

  return (
    <Title title={t('titles.invitation')}>
      <div className='min-h-page bg-gray-50 dark:bg-gray-800'>
        <div className='flex justify-center pt-10'>
          <div className='rounded-md p-4 w-11/12 bg-green-50 lg:w-4/6'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <CheckCircleIcon className='h-5 w-5 text-green-400' aria-hidden='true' />
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-green-800 dark:text-green-500'>
                  {t('apiNotifications.acceptInvitation')}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Title>
  )
}

export default memo(ConfirmShare)
