import { LockIcon } from '@phosphor-icons/react'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import { useState, useEffect, useCallback, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'

import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Modal from '~/ui/Modal'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const MAX_PASSWORD_LENGTH = 80

interface PasswordRequiredModalProps {
  isOpen: boolean
  onSubmit: (password: string) => Promise<{ success: boolean; error?: string }>
}

const PasswordRequiredModal = ({
  isOpen,
  onSubmit,
}: PasswordRequiredModalProps) => {
  const { t } = useTranslation('common')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Clear error when password changes
  useEffect(() => {
    if (error) {
      setError(null)
    }
  }, [password]) // eslint-disable-line react-hooks/exhaustive-deps

  const validatePassword = useCallback(() => {
    if (_isEmpty(password)) {
      return t('apiNotifications.enterPassword')
    }

    if (_size(password) >= MAX_PASSWORD_LENGTH) {
      return t('auth.common.passwordTooLong', { amount: MAX_PASSWORD_LENGTH })
    }

    return null
  }, [password, t])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const validationError = validatePassword()
    if (validationError) {
      setError(validationError)
      return
    }

    if (isLoading) {
      return
    }

    setIsLoading(true)

    try {
      const result = await onSubmit(password)

      if (!result.success && result.error) {
        setError(result.error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpened={isOpen}
      onClose={() => {}}
      size='regular'
      message={
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='flex flex-col items-center text-center'>
            <div className='mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15'>
              <LockIcon className='size-6 text-amber-600 dark:text-amber-400' />
            </div>
            <Text
              as='h3'
              size='lg'
              weight='semibold'
              className='mt-4 tracking-tight'
            >
              {t('titles.passwordProtected')}
            </Text>
            <Text as='p' size='sm' colour='muted' className='mt-2'>
              {t('project.passwordProtectedHint')}
            </Text>
          </div>

          <Input
            name='password'
            type='password'
            label={t('auth.common.password')}
            value={password}
            placeholder={t('auth.common.password')}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
          />

          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <Button
              variant='secondary'
              className='border-indigo-100 dark:border-slate-700/50 dark:bg-slate-900 dark:text-gray-50 dark:hover:bg-slate-800'
              as={Link}
              // @ts-expect-error
              to={routes.main}
            >
              {t('common.cancel')}
            </Button>
            <Button type='submit' loading={isLoading}>
              {t('common.continue')}
            </Button>
          </div>
        </form>
      }
    />
  )
}

export default PasswordRequiredModal
