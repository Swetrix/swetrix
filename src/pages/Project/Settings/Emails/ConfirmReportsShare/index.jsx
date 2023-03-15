import React, { useState, useEffect, memo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'

import Title from 'components/Title'
import Loader from 'ui/Loader'

import { confirmSubscriberInvite } from 'api'

const ConfirmReportsShare = () => {
  const { t } = useTranslation('common')
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleConfirm = async (token) => {
    try {
      await confirmSubscriberInvite(id, token)
    } catch (e) {
      setError(t('apiNotifications.invalidToken'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams(window.location.search)
    const token = query.get('token')

    if (!token) {
      setError(t('apiNotifications.invalidToken'))
      setLoading(false)
      return
    }

    handleConfirm(token)
  }, []) // eslint-disable-line

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

export default memo(ConfirmReportsShare)
