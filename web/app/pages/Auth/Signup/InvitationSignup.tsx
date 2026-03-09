import { ArrowRightIcon } from '@phosphor-icons/react'
import React, { useState, useEffect, memo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import {
  Link,
  Form,
  useActionData,
  useNavigation,
  useLoaderData,
} from 'react-router'
import { toast } from 'sonner'

import { HAVE_I_BEEN_PWNED_URL, isSelfhosted } from '~/lib/constants'
import type {
  InvitationSignupLoaderData,
  InvitationSignupActionData,
} from '~/routes/signup_.invitation.$id'
import Alert from '~/ui/Alert'
import Button from '~/ui/Button'
import Checkbox from '~/ui/Checkbox'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import routes from '~/utils/routes'
import { MIN_PASSWORD_CHARS } from '~/utils/validator'

const InvitationSignup = () => {
  const { t } = useTranslation('common')
  const navigation = useNavigation()
  const actionData = useActionData<InvitationSignupActionData>()
  const loaderData = useLoaderData<InvitationSignupLoaderData>()

  const [tos, setTos] = useState(false)
  const [checkIfLeaked, setCheckIfLeaked] = useState(true)
  const [clearedErrors, setClearedErrors] = useState<Set<string>>(new Set())

  const isFormSubmitting = navigation.state === 'submitting'
  const invitation = loaderData?.invitation

  useEffect(() => {
    if (actionData?.error && !actionData?.fieldErrors) {
      const errorMessage = Array.isArray(actionData.error)
        ? actionData.error[0]
        : actionData.error
      toast.error(errorMessage)
    }
  }, [actionData?.error, actionData?.fieldErrors, actionData?.timestamp])

  const clearFieldError = (fieldName: string) => {
    if (
      actionData?.fieldErrors?.[
        fieldName as keyof typeof actionData.fieldErrors
      ]
    ) {
      setClearedErrors((prev) => new Set(prev).add(fieldName))
    }
  }

  const getFieldError = (fieldName: string) => {
    if (clearedErrors.has(fieldName)) {
      return undefined
    }
    return actionData?.fieldErrors?.[
      fieldName as keyof typeof actionData.fieldErrors
    ]
  }

  const handleFormSubmit = () => {
    setClearedErrors(new Set())
  }

  if (loaderData?.error || !invitation) {
    return (
      <div className='flex min-h-min-footer items-center justify-center bg-gray-50 dark:bg-slate-950'>
        <div className='mx-auto max-w-md px-4 text-center'>
          <Text as='h1' size='2xl' weight='bold' className='mb-4'>
            {t('common.error')}
          </Text>
          <Text colour='muted' className='mb-6'>
            {loaderData?.error || t('auth.invitation.invalidLink')}
          </Text>
          <Link
            to={routes.signup}
            className='font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
          >
            {t('auth.signup.createAnAccount')}
          </Link>
        </div>
      </div>
    )
  }

  const typeLabel =
    invitation.type === 'project_share'
      ? t('auth.invitation.project')
      : t('auth.invitation.organisation')

  return (
    <div className='flex min-h-min-footer items-center justify-center bg-gray-50 dark:bg-slate-950'>
      <div className='w-full max-w-md px-4 py-12 sm:px-6'>
        <div className='mb-6'>
          <Text as='h1' size='3xl' weight='bold' className='tracking-tight'>
            {t('auth.signup.createAnAccount')}
          </Text>
        </div>

        <Alert variant='info' className='mb-6'>
          <p className='font-semibold'>
            <Trans
              t={t}
              i18nKey='auth.invitation.invitedToJoin'
              values={{ targetName: invitation.targetName }}
              components={{
                target: <span className='font-bold' />,
              }}
            />
          </p>
          <Trans
            t={t}
            i18nKey='auth.invitation.invitedByAs'
            values={{
              inviterEmail: invitation.inviterEmail,
              role: invitation.role,
              type: typeLabel,
            }}
            components={{
              role: <span className='font-medium capitalize' />,
            }}
          />
        </Alert>

        <Form method='post' className='space-y-4' onSubmit={handleFormSubmit}>
          <Input
            name='email'
            type='email'
            label={t('auth.common.email')}
            error={getFieldError('email')}
            placeholder='name@company.com'
            readOnly
            defaultValue={invitation.email}
          />
          <Input
            name='password'
            type='password'
            label={t('auth.common.password')}
            hint={t('auth.common.hint', { amount: MIN_PASSWORD_CHARS })}
            error={getFieldError('password')}
            disabled={isFormSubmitting}
            onChange={() => clearFieldError('password')}
          />
          <input type='hidden' name='tos' value={tos ? 'true' : 'false'} />
          <input
            type='hidden'
            name='checkIfLeaked'
            value={checkIfLeaked ? 'true' : 'false'}
          />

          {isSelfhosted ? null : (
            <Checkbox
              checked={tos}
              onChange={(checked) => {
                setTos(checked)
                clearFieldError('tos')
              }}
              disabled={isFormSubmitting}
              label={
                <Text as='span' size='sm'>
                  <Trans
                    t={t}
                    i18nKey='auth.signup.tos'
                    components={{
                      tos: (
                        <Link
                          to={routes.terms}
                          className='font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
                          aria-label={t('footer.tos')}
                        />
                      ),
                      pp: (
                        <Link
                          to={routes.privacy}
                          className='font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
                          aria-label={t('footer.pp')}
                        />
                      ),
                    }}
                  />
                </Text>
              }
              classes={{
                hint: '!text-red-600 dark:!text-red-500',
              }}
              hint={getFieldError('tos')}
            />
          )}

          <div className='flex items-center'>
            <Checkbox
              checked={checkIfLeaked}
              onChange={setCheckIfLeaked}
              disabled={isFormSubmitting}
              label={
                <Text size='sm'>{t('auth.common.checkLeakedPassword')}</Text>
              }
            />
            <Tooltip
              className='ml-2'
              text={
                <Trans
                  t={t}
                  i18nKey='auth.common.checkLeakedPasswordDesc'
                  components={{
                    db: (
                      <a
                        href={HAVE_I_BEEN_PWNED_URL}
                        className='font-medium underline decoration-dashed hover:decoration-solid'
                        target='_blank'
                        rel='noreferrer noopener'
                      />
                    ),
                  }}
                  values={{
                    database: 'haveibeenpwned.com',
                  }}
                />
              }
            />
          </div>

          <Button
            className='mt-6 flex w-full items-center justify-center gap-1'
            type='submit'
            loading={isFormSubmitting}
            primary
            giant
          >
            <span>
              {t('auth.invitation.createAndJoin', { type: typeLabel })}
            </span>
            <ArrowRightIcon className='size-4 translate-y-px' />
          </Button>
        </Form>

        <Text as='p' size='sm' colour='muted' className='mt-6 text-center'>
          <Trans
            t={t}
            i18nKey='auth.signup.alreadyAMember'
            components={{
              url: (
                <Link
                  to={routes.signin}
                  className='font-medium text-gray-900 underline decoration-dashed hover:decoration-solid dark:text-gray-300'
                  aria-label={t('titles.signin')}
                />
              ),
            }}
          />
        </Text>
      </div>
    </div>
  )
}

export default memo(InvitationSignup)
