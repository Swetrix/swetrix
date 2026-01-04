import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _size from 'lodash/size'
import { Trash2Icon } from 'lucide-react'
import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useFetcher, useLoaderData, useRevalidator } from 'react-router'
import { toast } from 'sonner'

import { transferProject } from '~/api'
import { TITLE_SUFFIX } from '~/lib/constants'
import { DetailedOrganisation } from '~/lib/models/Organisation'
import { useAuth } from '~/providers/AuthProvider'
import type { OrganisationSettingsActionData, OrganisationLoaderData } from '~/routes/organisations.$id'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import StatusPage from '~/ui/StatusPage'
import routes from '~/utils/routes'

import People from './People'
import { Projects } from './Projects'

const MAX_NAME_LENGTH = 50

const DEFAULT_ORGANISATION_NAME = 'Untitled Organisation'

const OrganisationSettings = () => {
  const { t } = useTranslation('common')
  const loaderData = useLoaderData<OrganisationLoaderData>()
  const navigate = useNavigate()
  const fetcher = useFetcher<OrganisationSettingsActionData>()
  const revalidator = useRevalidator()

  const { user } = useAuth()

  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferEmail, setTransferEmail] = useState('')

  const organisation = loaderData?.organisation || null
  const error = loaderData?.error

  const [form, setForm] = useState<Pick<DetailedOrganisation, 'name'>>(() => ({
    name: organisation?.name || '',
  }))

  const isSaving = fetcher.state === 'submitting'
  const isDeleting = fetcher.state === 'submitting' && fetcher.formData?.get('intent') === 'delete-organisation'

  // Handle fetcher responses
  if (fetcher.data?.success && fetcher.state === 'idle') {
    const { intent, organisation: updatedOrg } = fetcher.data

    if (intent === 'update-organisation') {
      if (updatedOrg && form.name !== updatedOrg.name) {
        setForm({ name: updatedOrg.name })
      }
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (fetcher.data?.success) {
      const { intent } = fetcher.data

      if (intent === 'update-organisation') {
        toast.success(t('apiNotifications.orgSettingsUpdated'))
        revalidator.revalidate()
      } else if (intent === 'delete-organisation') {
        toast.success(t('apiNotifications.organisationDeleted'))
        setShowDelete(false)
        navigate(routes.organisations)
      } else if (
        intent === 'invite-member' ||
        intent === 'remove-member' ||
        intent === 'update-member-role' ||
        intent === 'add-project' ||
        intent === 'remove-project'
      ) {
        revalidator.revalidate()
      }
    } else if (fetcher.data?.error) {
      toast.error(fetcher.data.error)
      setShowDelete(false)
    }
  }, [fetcher.data, t, navigate]) // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const isOrganisationOwner = useMemo(() => {
    if (!organisation) {
      return false
    }

    const owner = organisation.members.find((member) => member.role === 'owner')

    return owner?.user?.email === user?.email
  }, [organisation, user])

  const onSubmit = (formData: Pick<DetailedOrganisation, 'name'>) => {
    if (fetcher.state === 'submitting') return

    const fd = new FormData()
    fd.set('intent', 'update-organisation')
    fd.set('name', formData.name)
    fetcher.submit(fd, { method: 'post' })
  }

  const onDelete = () => {
    if (fetcher.state === 'submitting') return

    const fd = new FormData()
    fd.set('intent', 'delete-organisation')
    fetcher.submit(fd, { method: 'post' })
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

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
    await transferProject(organisation?.id || '', transferEmail)
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

  if (!organisation) {
    return (
      <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  if (error) {
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
        <People organisation={organisation} />
        <Projects organisation={organisation} />
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

export default OrganisationSettings
