import cx from 'clsx'
import dayjs from 'dayjs'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _toLower from 'lodash/toLower'
import {
  EnvelopeSimpleIcon,
  TrashIcon,
  CaretDownIcon,
  CheckIcon,
} from '@phosphor-icons/react'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher, useParams } from 'react-router'
import { toast } from 'sonner'

import useOnClickOutside from '~/hooks/useOnClickOutside'
import { reportFrequencyForEmailsOptions } from '~/lib/constants'
import { Subscriber } from '~/lib/models/Subscriber'
import { ProjectSettingsActionData } from '~/routes/projects.settings.$id'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Modal from '~/ui/Modal'
import { isValidEmail } from '~/utils/validator'

interface ModalMessageProps {
  handleInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  beenSubmitted: boolean
  errors: {
    email?: string
    reportFrequency?: string
  }
  form: {
    email: string
    reportFrequency: string
  }
}

const ModalMessage = ({
  handleInput,
  beenSubmitted,
  errors,
  form,
}: ModalMessageProps) => {
  const { t } = useTranslation('common')

  return (
    <div>
      <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
        {t('project.settings.addARecipient')}
      </h2>
      <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
        {t('project.settings.addARecipientDesc')}
      </p>
      <Input
        name='email'
        type='email'
        label={t('auth.common.email')}
        value={form.email}
        placeholder='you@example.com'
        className='mt-4'
        onChange={handleInput}
        error={beenSubmitted ? errors.email : null}
      />
      <fieldset className='mt-4'>
        <legend className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
          {t('project.emails.reportFrequency')}
        </legend>
        <div
          className={cx(
            'mt-1 -space-y-px rounded-md bg-white dark:bg-slate-900',
            {
              'border border-red-300': errors.reportFrequency,
            },
          )}
        >
          {reportFrequencyForEmailsOptions.map((item, index) => (
            <ReportFrequencyOption
              key={item.value}
              item={item}
              index={index}
              form={form}
              handleInput={handleInput}
              totalOptions={reportFrequencyForEmailsOptions.length}
            />
          ))}
        </div>
        {errors.reportFrequency ? (
          <p
            className='mt-2 text-sm text-red-600 dark:text-red-500'
            id='reportFrequency-error'
          >
            {errors.reportFrequency}
          </p>
        ) : null}
      </fieldset>
    </div>
  )
}

interface ReportFrequencyOptionProps {
  item: { value: string; label: string }
  index: number
  form: { reportFrequency: string }
  handleInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  totalOptions: number
}

const ReportFrequencyOption = ({
  item,
  index,
  form,
  handleInput,
  totalOptions,
}: ReportFrequencyOptionProps) => {
  const { t } = useTranslation('common')

  return (
    <label
      className={cx(
        'relative flex cursor-pointer border border-gray-200 p-4 dark:border-slate-600',
        {
          'z-10 border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-600/40':
            item.value === form.reportFrequency,
          'border-gray-200': form.reportFrequency !== item.value,
          'rounded-t-md': index === 0,
          'rounded-b-md': index === totalOptions - 1,
        },
      )}
    >
      <input
        name='reportFrequency'
        className='h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500'
        type='radio'
        value={item.value}
        onChange={handleInput}
        checked={form.reportFrequency === item.value}
      />
      <span
        className={cx('ml-3 block text-sm font-medium', {
          'text-indigo-900 dark:text-white':
            form.reportFrequency === item.value,
          'text-gray-700 dark:text-gray-200':
            form.reportFrequency !== item.value,
        })}
      >
        {t(`profileSettings.${item.value}`)}
      </span>
    </label>
  )
}

interface EmailListProps {
  data: {
    id: string
    addedAt: string
    isConfirmed: boolean
    projectId: string
    email: string
    reportFrequency: string
  }
  onRemove: () => void
  setEmails: (
    value: Subscriber[] | ((prevVar: Subscriber[]) => Subscriber[]),
  ) => void
}

const EmailList = ({ data, onRemove, setEmails }: EmailListProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { id: projectId } = useParams()
  const fetcher = useFetcher<ProjectSettingsActionData>()
  const [open, setOpen] = useState(false)
  const openRef = useRef<HTMLUListElement>(null)
  useOnClickOutside(openRef, () => setOpen(false))
  const { id, addedAt, isConfirmed, email, reportFrequency } = data || {}

  useEffect(() => {
    if (fetcher.data?.intent === 'update-subscriber') {
      if (fetcher.data.success && fetcher.data.subscriber) {
        const updated = fetcher.data.subscriber
        setEmails((prev) =>
          _map(prev, (item) => (item.id === updated.id ? updated : item)),
        )
        toast.success(t('apiNotifications.updatedPeriodEmailReports'))
      } else if (fetcher.data.error) {
        toast.error(
          typeof fetcher.data.error === 'string'
            ? fetcher.data.error
            : t('apiNotifications.updatedPeriodEmailReportsError'),
        )
      }
    }
  }, [fetcher.data, setEmails, t])

  const changeRole = (reportType: { value: string; label: string }) => {
    fetcher.submit(
      {
        intent: 'update-subscriber',
        subscriberId: id,
        reportFrequency: reportType.value,
      },
      { method: 'post', action: `/projects/settings/${projectId}` },
    )
    setOpen(false)
  }

  return (
    <tr className='bg-white hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800/50'>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
        {email}
      </td>
      <td className='px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100'>
        {language === 'en'
          ? dayjs(addedAt).locale(language).format('MMMM D, YYYY')
          : dayjs(addedAt).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='px-4 py-3 text-right text-sm whitespace-nowrap'>
        {isConfirmed ? (
          <div>
            <button
              onClick={() => setOpen(!open)}
              type='button'
              className='inline-flex items-center rounded-full border border-gray-200 bg-white py-0.5 pr-1 pl-2 text-sm leading-5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-gray-600'
            >
              {t(`profileSettings.${_toLower(reportFrequency)}`)}
              <CaretDownIcon
                style={{ transform: open ? 'rotate(180deg)' : '' }}
                className='ml-0.5 h-4 w-4 pt-px'
              />
            </button>
            {open ? (
              <ul
                ref={openRef}
                className='absolute right-0 z-10 mt-2 w-72 origin-top-right divide-y divide-gray-200 rounded-md bg-white text-left focus:outline-hidden dark:divide-gray-700 dark:bg-slate-900'
              >
                {_map(reportFrequencyForEmailsOptions, (item, index) => (
                  <li
                    onClick={() => changeRole(item)}
                    className={cx(
                      'group flex cursor-pointer items-center justify-between p-4 hover:bg-indigo-600',
                      index === 0 && 'rounded-t-md',
                    )}
                    key={item.value}
                  >
                    <div>
                      <p className='font-bold text-gray-700 group-hover:text-gray-200 dark:text-gray-200'>
                        {t(`profileSettings.${_toLower(item.label)}`)}
                      </p>
                    </div>
                    {reportFrequency === item.value ? (
                      <span className='text-indigo-600 group-hover:text-gray-200'>
                        <CheckIcon className='ml-1 h-7 w-7 pt-px' />
                      </span>
                    ) : null}
                  </li>
                ))}
                <li
                  onClick={onRemove}
                  className='group flex cursor-pointer items-center justify-between rounded-b-md p-4 hover:bg-gray-200 dark:hover:bg-gray-700'
                >
                  <p className='font-bold text-red-600 dark:text-red-500'>
                    {t('project.settings.removeMember')}
                  </p>
                </li>
              </ul>
            ) : null}
          </div>
        ) : (
          <div className='flex items-center justify-end'>
            <Badge
              colour='yellow'
              className='mr-3'
              label={t('common.pending')}
            />
            <Button
              type='button'
              className='rounded-md bg-white text-base font-medium text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              small
              onClick={onRemove}
            >
              <TrashIcon className='h-4 w-4' strokeWidth={1.5} />
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}

const NoSubscribers = () => {
  const { t } = useTranslation('common')

  return (
    <div className='flex flex-col py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-7xl text-gray-900 dark:text-gray-50'>
        <h2 className='mb-8 px-4 text-center text-xl leading-snug'>
          {t('project.settings.noPeople')}
        </h2>
      </div>
    </div>
  )
}

const Emails = ({ projectId }: { projectId: string }) => {
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation('common')
  const fetcher = useFetcher<ProjectSettingsActionData>()
  const loadFetcher = useFetcher<ProjectSettingsActionData>()
  const removeFetcher = useFetcher<ProjectSettingsActionData>()
  const [form, setForm] = useState<{
    email: string
    reportFrequency: string
  }>({
    email: '',
    reportFrequency: reportFrequencyForEmailsOptions[3].value,
  })
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [errors, setErrors] = useState<{
    email?: string
    reportFrequency?: string
  }>({})
  const [validated, setValidated] = useState(false)
  const [emails, setEmails] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  })

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [emailToRemove, setEmailToRemove] = useState<Subscriber | null>(null)
  const removingEmailId = useRef<string | null>(null)

  const isDeleting = removeFetcher.state !== 'idle'

  useEffect(() => {
    loadFetcher.submit(
      {
        intent: 'get-subscribers',
        offset: String(pagination.page - 1),
        limit: String(pagination.limit),
      },
      { method: 'post', action: `/projects/settings/${projectId}` },
    )
  }, []) // eslint-disable-line

  useEffect(() => {
    if (loadFetcher.data?.intent === 'get-subscribers') {
      if (loadFetcher.data.success) {
        setTimeout(() => {
          setEmails(loadFetcher.data!.subscribers || [])
          setPagination((old) => ({
            ...old,
            total: loadFetcher.data!.subscribersCount || 0,
          }))
        }, 0)
      }
      setTimeout(() => setLoading(false), 0)
    }
  }, [loadFetcher.data])

  useEffect(() => {
    if (fetcher.data?.intent === 'add-subscriber') {
      if (fetcher.data.success && fetcher.data.subscriber) {
        setTimeout(
          () => setEmails((prev) => [...prev, fetcher.data!.subscriber!]),
          0,
        )
        toast.success(t('apiNotifications.userInvited'))
      } else if (fetcher.data.error) {
        toast.error(
          typeof fetcher.data.error === 'string'
            ? fetcher.data.error
            : t('apiNotifications.userInviteError'),
        )
      }
    }
  }, [fetcher.data, t])

  useEffect(() => {
    if (
      removeFetcher.state === 'idle' &&
      removeFetcher.data?.intent === 'remove-subscriber'
    ) {
      if (removeFetcher.data.success) {
        const capturedId = removingEmailId.current
        setTimeout(() => {
          setEmails((prev) => _filter(prev, (s) => s.id !== capturedId))
          setShowDeleteModal(false)
          setEmailToRemove(null)
        }, 0)
        removingEmailId.current = null
      } else if (removeFetcher.data.error) {
        toast.error(
          typeof removeFetcher.data.error === 'string'
            ? removeFetcher.data.error
            : t('apiNotifications.somethingWentWrong'),
        )
      }
    }
  }, [removeFetcher.data, removeFetcher.state, t])

  const validate = () => {
    const allErrors: {
      email?: string
      reportFrequency?: string
    } = {}

    if (!isValidEmail(form.email)) {
      allErrors.email = t('auth.common.badEmailError')
    }

    const valid = _isEmpty(_keys(allErrors))

    setErrors(allErrors)
    setValidated(valid)
  }

  useEffect(() => {
    if (showModal) {
      setTimeout(() => validate(), 0)
    }
  }, [form]) // eslint-disable-line

  const handleInput = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const onSubmit = () => {
    setShowModal(false)
    setBeenSubmitted(false)
    setErrors({})
    setValidated(false)

    fetcher.submit(
      {
        intent: 'add-subscriber',
        email: form.email,
        reportFrequency: form.reportFrequency,
      },
      { method: 'post', action: `/projects/settings/${projectId}` },
    )

    setTimeout(
      () =>
        setForm({
          email: '',
          reportFrequency: reportFrequencyForEmailsOptions[3].value,
        }),
      300,
    )
  }

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()
    e.stopPropagation()

    setBeenSubmitted(true)
    if (validated) {
      onSubmit()
    } else {
      validate()
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setBeenSubmitted(false)
    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(
      () =>
        setForm({
          email: '',
          reportFrequency: reportFrequencyForEmailsOptions[3].value,
        }),
      300,
    )
    setErrors({})
  }

  const onRemove = (emailId: string) => {
    if (isDeleting) {
      return
    }

    removingEmailId.current = emailId
    removeFetcher.submit(
      { intent: 'remove-subscriber', subscriberId: emailId },
      { method: 'post', action: `/projects/settings/${projectId}` },
    )
  }

  return (
    <div>
      <div className='mb-3 flex flex-col items-start justify-between gap-y-2 sm:flex-row sm:items-center'>
        <div>
          <h3 className='text-lg font-bold text-gray-900 dark:text-gray-50'>
            {t('project.emails.title')}
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            {t('project.emails.description')}
          </p>
        </div>
        <Button
          className='h-8 pl-2 whitespace-nowrap'
          primary
          regular
          type='button'
          onClick={() => setShowModal(true)}
        >
          <>
            <EnvelopeSimpleIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
            {t('project.emails.add')}
          </>
        </Button>
      </div>
      <div>
        {loading ? (
          <div className='flex justify-center py-8'>
            <Loader />
          </div>
        ) : _isEmpty(emails) ? (
          <NoSubscribers />
        ) : (
          <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700'>
            <table className='min-w-full divide-y divide-gray-200 dark:divide-slate-700'>
              <thead className='bg-gray-50 dark:bg-slate-800'>
                <tr>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('auth.common.email')}
                  </th>
                  <th
                    scope='col'
                    className='px-4 py-3 text-left text-xs font-bold tracking-wider text-gray-900 uppercase dark:text-white'
                  >
                    {t('auth.common.addedOn')}
                  </th>
                  <th scope='col' />
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900'>
                {_map(emails, (email) => (
                  <EmailList
                    data={email}
                    key={email.id}
                    onRemove={() => {
                      setEmailToRemove(email)
                      setShowDeleteModal(true)
                    }}
                    setEmails={setEmails}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal
        onClose={closeModal}
        customButtons={
          <button
            type='button'
            className='inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm'
            onClick={handleSubmit}
          >
            {t('project.emails.add')}
          </button>
        }
        closeText={t('common.cancel')}
        message={
          <ModalMessage
            form={form}
            handleInput={handleInput}
            errors={errors}
            beenSubmitted={beenSubmitted}
          />
        }
        isOpened={showModal}
      />

      <Modal
        onClose={() => {
          setShowDeleteModal(false)
          setEmailToRemove(null)
        }}
        onSubmit={() => {
          if (!emailToRemove) return
          onRemove(emailToRemove.id)
        }}
        submitText={t('common.yes')}
        type='confirmed'
        closeText={t('common.no')}
        title={t('project.settings.removeUser', { user: emailToRemove?.email })}
        message={t('project.settings.removeReportConfirm')}
        isOpened={showDeleteModal}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default Emails
