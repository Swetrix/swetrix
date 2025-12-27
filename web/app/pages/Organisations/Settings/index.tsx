import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _size from 'lodash/size'
import { Trash2Icon } from 'lucide-react'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { transferProject, getOrganisation, updateOrganisation, deleteOrganisation } from '~/api'
import { withAuthentication, auth } from '~/hoc/protected'
import { useRequiredParams } from '~/hooks/useRequiredParams'
import { TITLE_SUFFIX } from '~/lib/constants'
import { DetailedOrganisation } from '~/lib/models/Organisation'
import { useAuth } from '~/providers/AuthProvider'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

import People from './People'
import { Projects } from './Projects'

// import { ArrowLeftRight } from 'lucide-react'

const MAX_NAME_LENGTH = 50

const DEFAULT_ORGANISATION_NAME = 'Untitled Organisation'

const OrganisationSettings = () => {
  const { t } = useTranslation('common')
  const { id } = useRequiredParams<{ id: string }>()
  const navigate = useNavigate()

  const { user, isLoading: authLoading } = useAuth()

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

  const [organisation, setOrganisation] = useState<DetailedOrganisation | null>(null)
  const [form, setForm] = useState<Pick<DetailedOrganisation, 'name'>>({
    name: '',
  })

  const isOrganisationOwner = useMemo(() => {
    if (!organisation) {
      return false
    }

    const owner = organisation.members.find((member) => member.role === 'owner')

    return owner?.user?.email === user?.email
  }, [organisation, user])

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

  const reloadOrganisation = useCallback(async () => {
    try {
      const result = await getOrganisation(id)
      setOrganisation(result)
      setForm({
        name: result.name,
      })
    } catch (reason: any) {
      console.error(`[ERROR] Error while reloading organisation: ${reason}`)
    }
  }, [id])

  useEffect(() => {
    if (authLoading) {
      return
    }

    loadOrganisation(id)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, id])

  const onSubmit = async (data: any) => {
    if (isSaving) {
      return
    }

    setIsSaving(true)

    try {
      await updateOrganisation(id, { name: data.name })
      toast.success(t('apiNotifications.orgSettingsUpdated'))
    } catch (reason: any) {
      toast.error(reason)
    } finally {
      setIsSaving(false)
    }
  }

  const onDelete = async () => {
    if (isDeleting) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteOrganisation(id)
      toast.success(t('apiNotifications.organisationDeleted'))
      navigate(routes.organisations)
    } catch (reason: any) {
      toast.error(reason)
    } finally {
      setIsDeleting(false)
      setShowDelete(false)
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

  if (isLoading || isLoading === null || !organisation) {
    return (
      <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  if (error && !isLoading) {
    return (
      <StatusPage
        type='error'
        title={t('apiNotifications.somethingWentWrong')}
        description={t('apiNotifications.errorCode', { error })}
        actions={[
          { label: t('dashboard.reloadPage'), onClick: () => window.location.reload(), primary: true },
          { label: t('notFoundPage.support'), to: routes.contact },
        ]}
      />
    )
  }

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 pb-40 dark:bg-slate-900'>
      <form className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8' onSubmit={handleSubmit}>
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
              as={Link}
              // @ts-expect-error
              to={routes.organisations}
              secondary
              regular
            >
              {t('common.cancel')}
            </Button>
            <Button type='submit' loading={isSaving} primary regular>
              {t('common.save')}
            </Button>
          </div>
          {isOrganisationOwner ? (
            <div className='flex flex-wrap justify-center gap-2'>
              {/* <Button onClick={() => setShowTransfer(true)} semiDanger semiSmall>
                <ArrowLeftRight className='mr-1 h-5 w-5' />
                {t('project.settings.transfer')}
              </Button> */}
              <Button onClick={() => setShowDelete(true)} disabled={isDeleting} danger semiSmall>
                <Trash2Icon className='mr-1 h-5 w-5' strokeWidth={1.5} />
                {t('organisations.delete')}
              </Button>
            </div>
          ) : null}
        </div>
        <hr className='mt-2 border-gray-200 sm:mt-5 dark:border-gray-600' />
        <People organisation={organisation} reloadOrganisation={reloadOrganisation} />
        <Projects organisation={organisation} reloadOrganisation={reloadOrganisation} />
      </form>
      <Modal
        onClose={() => setShowDelete(false)}
        onSubmit={onDelete}
        submitText={t('organisations.delete')}
        closeText={t('common.close')}
        title={t('organisations.modals.delete.title', {
          organisation: form.name,
        })}
        message={t('organisations.modals.delete.message')}
        submitType='danger'
        type='error'
        isOpened={showDelete}
        isLoading={isDeleting}
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
                name: form.name || DEFAULT_ORGANISATION_NAME,
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

export default withAuthentication(OrganisationSettings, auth.authenticated)
