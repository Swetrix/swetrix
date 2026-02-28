import React, { useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { Link, Form, useActionData, useNavigation } from 'react-router'
import { toast } from 'sonner'

import type { CreateNewPasswordActionData } from '~/routes/password-reset.$id'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import routes from '~/utils/routes'
import { MIN_PASSWORD_CHARS } from '~/utils/validator'
import { Text } from '~/ui/Text'

const CreateNewPassword = () => {
  const { t } = useTranslation('common')
  const navigation = useNavigation()
  const actionData = useActionData<CreateNewPasswordActionData>()

  const isSubmitting = navigation.state === 'submitting'

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
            {t('auth.recovery.title')}
          </h2>
        </div>
        <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]'>
          <div className='bg-white px-6 py-12 shadow-xs ring-1 ring-gray-200 sm:rounded-lg sm:px-12 dark:bg-slate-950 dark:ring-slate-800'>
            <Form method='post' className='space-y-6'>
              <Input
                name='password'
                type='password'
                label={t('auth.recovery.newPassword')}
                hint={t('auth.common.hint', { amount: MIN_PASSWORD_CHARS })}
                error={actionData?.fieldErrors?.password}
                disabled={isSubmitting}
              />
              <Input
                name='repeat'
                type='password'
                label={t('auth.common.repeat')}
                error={actionData?.fieldErrors?.repeat}
                disabled={isSubmitting}
              />
              <Button
                className='w-full justify-center'
                type='submit'
                loading={isSubmitting}
                primary
                giant
              >
                {t('auth.recovery.save')}
              </Button>
            </Form>
          </div>
          <Text as='p' size='sm' className='mt-10 text-center'>
            <Trans
              t={t}
              i18nKey='auth.signup.alreadyAMember'
              components={{
                url: (
                  <Link
                    to={routes.signin}
                    className='underline decoration-dashed hover:decoration-solid'
                    aria-label={t('footer.tos')}
                  />
                ),
              }}
            />
          </Text>
        </div>
      </div>
    </div>
  )
}

export default CreateNewPassword
