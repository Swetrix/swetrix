import React, { useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import {
  Link,
  Form,
  useActionData,
  useNavigation,
  useSearchParams,
} from 'react-router'
import { toast } from 'sonner'

import { isSelfhosted, TRIAL_DAYS } from '~/lib/constants'
import type { ForgotPasswordActionData } from '~/routes/recovery'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const ForgotPassword = () => {
  const { t } = useTranslation('common')
  const navigation = useNavigation()
  const actionData = useActionData<ForgotPasswordActionData>()
  const [searchParams] = useSearchParams()

  const isSubmitting = navigation.state === 'submitting'

  useEffect(() => {
    if (searchParams.get('password_reset_sent') === 'true') {
      toast.success(t('auth.forgot.sent'))
    }
  }, [searchParams, t])

  useEffect(() => {
    if (actionData?.error) {
      toast.error(actionData.error)
    }
  }, [actionData?.error, actionData?.timestamp])

  return (
    <div>
      <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-10 sm:px-6 lg:px-8 dark:bg-slate-950'>
        <div className='sm:mx-auto sm:w-full sm:max-w-md'>
          <h2 className='text-center text-2xl leading-9 font-bold text-gray-900 dark:text-gray-50'>
            {t('titles.recovery')}
          </h2>
        </div>
        <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]'>
          <div className='bg-white px-6 py-12 shadow-xs ring-1 ring-gray-200 sm:rounded-lg sm:px-12 dark:bg-slate-950 dark:ring-slate-800'>
            <Form method='post' className='space-y-6'>
              <Input
                name='email'
                type='email'
                label={t('auth.common.email')}
                error={actionData?.fieldErrors?.email}
                placeholder='name@company.com'
                disabled={isSubmitting}
              />
              <Button
                className='w-full justify-center'
                type='submit'
                loading={isSubmitting}
                primary
                giant
              >
                {t('auth.forgot.reset')}
              </Button>
            </Form>
          </div>
          {isSelfhosted ? null : (
            <Text as='p' size='sm' className='mt-10 text-center'>
              <Trans
                t={t}
                i18nKey='auth.signin.notAMember'
                components={{
                  url: (
                    <Link
                      to={routes.signup}
                      className='leading-6 font-medium underline decoration-dashed hover:decoration-solid'
                      aria-label={t('footer.tos')}
                    />
                  ),
                }}
                values={{
                  amount: TRIAL_DAYS,
                }}
              />
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
