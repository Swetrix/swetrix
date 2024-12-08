import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Link, useNavigate } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _keys from 'lodash/keys'

import { withAuthentication, auth } from 'hoc/protected'
import { TITLE_SUFFIX } from 'redux/constants'
import { transferProject, getOrganisation, updateOrganisation, deleteOrganisation } from 'api'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import Modal from 'ui/Modal'
import routes from 'utils/routes'

import People from './People'
import { useRequiredParams } from 'hooks/useRequiredParams'
import { DetailedOrganisation } from 'redux/models/Organisation'
import { StateType } from 'redux/store'
import { useSelector } from 'react-redux'
import { Projects } from './Projects'
import { TrashIcon, XCircleIcon } from '@heroicons/react/24/outline'
// import { ArrowLeftRight } from 'lucide-react'

const MAX_NAME_LENGTH = 50

const DEFAULT_ORGANISATION_NAME = 'Untitled Organisation'

const OrganisationSettings = () => {
  const { t } = useTranslation('common')
  const { id } = useRequiredParams<{ id: string }>()
  const navigate = useNavigate()

  const { loading: authLoading, user } = useSelector((state: StateType) => state.auth)

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
      <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8'>
        <Loader />
      </div>
    )
  }

  if (error && !isLoading) {
    return (
      <div className='min-h-page bg-gray-50 px-4 py-16 dark:bg-slate-900 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
        <div className='mx-auto max-w-max'>
          <main className='sm:flex'>
            <XCircleIcon className='h-12 w-12 text-red-400' aria-hidden='true' />
            <div className='sm:ml-6'>
              <div className='max-w-prose sm:border-l sm:border-gray-200 sm:pl-6'>
                <h1 className='text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl'>
                  {t('apiNotifications.somethingWentWrong')}
                </h1>
                <p className='mt-4 text-2xl font-medium tracking-tight text-gray-700 dark:text-gray-200'>
                  {t('apiNotifications.errorCode', { error })}
                </p>
              </div>
              <div className='mt-8 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6'>
                <button
                  type='button'
                  onClick={() => window.location.reload()}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                >
                  {t('dashboard.reloadPage')}
                </button>
                <Link
                  to={routes.contact}
                  className='inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 dark:focus:ring-gray-50'
                >
                  {t('notFoundPage.support')}
                </Link>
              </div>
            </div>
          </main>
        </div>
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
                <TrashIcon className='mr-1 h-5 w-5' />
                {t('organisations.delete')}
              </Button>
            </div>
          ) : null}
        </div>
        <hr className='mt-2 border-gray-200 dark:border-gray-600 sm:mt-5' />
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
