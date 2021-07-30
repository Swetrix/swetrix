import React, { useState, useEffect, memo } from 'react'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/solid'
import { XCircleIcon } from '@heroicons/react/solid'

import Title from 'components/Title'
import { authActions } from 'redux/actions/auth'
import Loader from 'ui/Loader'

const VerifyEmail = () => {
  const dispatch = useDispatch()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const path = window.location.pathname.split('/')[1]

    dispatch(authActions.emailVerifyAsync(
      { path, id },
      () => setLoading(false),
      (error) => {
        setError(error.message)
        setLoading(false)
      }))
  }, [dispatch, id])

  if (loading) {
    return (
      <Title title='Email verification'>
        <Loader />
      </Title>
    )
  }

  if (error) {
    return (
      <Title title='Email verification'>
        <div className='flex justify-center pt-10'>
          <div className='rounded-md p-4 w-11/12 bg-red-50 lg:w-4/6'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <XCircleIcon className='h-5 w-5 text-red-400' aria-hidden='true' />
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800'>{error}</h3>
              </div>
            </div>
          </div>
        </div>
      </Title>
    )
  }

  return (
    <Title title='Email verification'>
      <div className='flex justify-center pt-10'>
        <div className='rounded-md p-4 w-11/12 bg-green-50 lg:w-4/6'>
          <div className='flex'>
            <div className='flex-shrink-0'>
              <CheckCircleIcon className='h-5 w-5 text-green-400' aria-hidden='true' />
            </div>
            <div className='ml-3'>
              <h3 className='text-sm font-medium text-green-800'>
                Your email has been successfully verified!
              </h3>
            </div>
          </div>
        </div>
      </div>
    </Title>
  )
}

export default memo(VerifyEmail)
