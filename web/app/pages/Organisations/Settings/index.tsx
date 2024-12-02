import React, { useState, useEffect, memo } from 'react'
import { toast } from 'sonner'
import { useNavigate } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'
import _keys from 'lodash/keys'

import { withAuthentication, auth } from 'hoc/protected'
import { TITLE_SUFFIX } from 'redux/constants'
import { transferProject, getOrganisation } from 'api'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import Modal from 'ui/Modal'
import routes from 'utils/routes'

import People from './People'
import { useRequiredParams } from 'hooks/useRequiredParams'
import { Organisation } from 'redux/models/Organisation'
import { StateType } from 'redux/store'
import { useSelector } from 'react-redux'

const MAX_NAME_LENGTH = 50

const DEFAULT_PROJECT_NAME = 'Untitled Project'

const OrganisationSettings = () => {
  const { t } = useTranslation('common')
  const { id } = useRequiredParams<{ id: string }>()
  const navigate = useNavigate()

  const { loading: authLoading } = useSelector((state: StateType) => state.auth)

  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferEmail, setTransferEmail] = useState('')

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [organisation, setOrganisation] = useState<Organisation | null>(null)
  const [form, setForm] = useState<Pick<Organisation, 'name'>>({
    name: '',
  })

  const loadOrganisation = async (organisationId: string) => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const result = await getOrganisation(organisationId)
      setOrganisation(result)
      setForm({
        name: result.name,
      })
    } catch (reason: any) {
      setError(reason)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) {
      return
    }

    loadOrganisation(id)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, id])

  const onSubmit = async (form: any) => {}

  const onDelete = async () => {
    setShowDelete(false)

    if (!isDeleting) {
      setIsDeleting(true)
      try {
        toast.success(t('project.settings.deleted'))

        // todo

        navigate(routes.organisations)
      } catch (reason: any) {
        toast.error(reason)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const validate = () => {
    const allErrors: {
      name?: string
      origins?: string
      ipBlacklist?: string
      password?: string
    } = {}

    if (_isEmpty(form.name)) {
      allErrors.name = t('project.settings.noNameError')
    }

    if (_size(form.name) > MAX_NAME_LENGTH) {
      allErrors.name = t('project.settings.pxCharsError', { amount: MAX_NAME_LENGTH })
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      onSubmit(form)
    }
  }

  const onCancel = () => {
    navigate(_replace(routes.project, ':id', id))
  }

  const onTransfer = async () => {
    await transferProject(id, transferEmail)
      .then(() => {
        toast.success(t('apiNotifications.transferRequestSent'))
        navigate(routes.dashboard)
      })
      .catch((reason) => {
        toast.error(reason)
      })
      .finally(() => {
        setShowTransfer(false)
        setTransferEmail('')
      })
  }

  const title = `${t('project.settings.settings')} ${form.name}`

  useEffect(() => {
    document.title = `${t('project.settings.settings')} ${form.name} ${TITLE_SUFFIX}`
  }, [form, t])

  if (isLoading || isLoading === null) {
    return (
      <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 pb-40 dark:bg-slate-900 sm:px-6 lg:px-8'>
      <form className='mx-auto w-full max-w-7xl' onSubmit={handleSubmit}>
        <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{title}</h2>
        <h3 className='mt-4 text-lg font-bold text-gray-900 dark:text-gray-50'>{t('profileSettings.general')}</h3>
        <Input
          name='name'
          label={t('common.name')}
          value={form.name}
          className='mt-2'
          onChange={handleInput}
          error={beenSubmitted ? errors.name : null}
        />
        <div className='mt-8 flex flex-wrap justify-center gap-2 sm:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              className='border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              onClick={onCancel}
              secondary
              regular
            >
              {t('common.cancel')}
            </Button>
            <Button type='submit' loading={isSaving} primary regular>
              {t('common.save')}
            </Button>
          </div>
          {/* {!project?.shared && (
            <div className='flex flex-wrap justify-center gap-2'>
              {!isSelfhosted && (
                <Button onClick={() => setShowTransfer(true)} semiDanger semiSmall>
                  <>
                    <RocketLaunchIcon className='mr-1 h-5 w-5' />
                    {t('project.settings.transfer')}
                  </>
                </Button>
              )}
              <Button onClick={() => !isDeleting && setShowDelete(true)} loading={isDeleting} danger semiSmall>
                <>
                  <ExclamationTriangleIcon className='mr-1 h-5 w-5' />
                  {t('project.settings.delete')}
                </>
              </Button>
            </div>
          )} */}
        </div>
        <hr className='mt-2 border-gray-200 dark:border-gray-600 sm:mt-5' />
        <People organisation={organisation} />
      </form>
      <Modal
        onClose={() => setShowDelete(false)}
        onSubmit={onDelete}
        submitText={t('project.settings.delete')}
        closeText={t('common.close')}
        title={t('project.settings.qDelete')}
        message={t('project.settings.deleteHint')}
        submitType='danger'
        type='error'
        isOpened={showDelete}
      />
      <Modal
        onClose={() => {
          setShowTransfer(false)
        }}
        submitText={t('project.settings.transfer')}
        closeText={t('common.cancel')}
        message={
          <div>
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>{t('project.settings.transferTo')}</h2>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t('project.settings.transferHint', {
                name: form.name || DEFAULT_PROJECT_NAME,
              })}
            </p>
            <Input
              name='email'
              type='email'
              label={t('project.settings.transfereeEmail')}
              value={transferEmail}
              placeholder='you@example.com'
              className='mt-4'
              onChange={(e) => setTransferEmail(e.target.value)}
            />
          </div>
        }
        isOpened={showTransfer}
        onSubmit={onTransfer}
      />
    </div>
  )
}

export default memo(withAuthentication(OrganisationSettings, auth.authenticated))
