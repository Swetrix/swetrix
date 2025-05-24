import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline'
import cx from 'clsx'
import dayjs from 'dayjs'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _toLower from 'lodash/toLower'
import { MailPlusIcon, Trash2Icon } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { addSubscriber, removeSubscriber, getSubscribers, updateSubscriber } from '~/api'
import useOnClickOutside from '~/hooks/useOnClickOutside'
import { reportFrequencyForEmailsOptions } from '~/lib/constants'
import { Subscriber } from '~/lib/models/Subscriber'
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

const ModalMessage = ({ handleInput, beenSubmitted, errors, form }: ModalMessageProps) => {
  const { t } = useTranslation('common')

  return (
    <div>
      <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>{t('project.settings.addARecipient')}</h2>
      <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>{t('project.settings.addARecipientDesc')}</p>
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
          className={cx('mt-1 -space-y-px rounded-md bg-white dark:bg-slate-900', {
            'border border-red-300': errors.reportFrequency,
          })}
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
          <p className='mt-2 text-sm text-red-600 dark:text-red-500' id='reportFrequency-error'>
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

const ReportFrequencyOption = ({ item, index, form, handleInput, totalOptions }: ReportFrequencyOptionProps) => {
  const { t } = useTranslation('common')

  return (
    <label
      className={cx('relative flex cursor-pointer border border-gray-200 p-4 dark:border-slate-600', {
        'z-10 border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-600/40':
          item.value === form.reportFrequency,
        'border-gray-200': form.reportFrequency !== item.value,
        'rounded-t-md': index === 0,
        'rounded-b-md': index === totalOptions - 1,
      })}
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
          'text-indigo-900 dark:text-white': form.reportFrequency === item.value,
          'text-gray-700 dark:text-gray-200': form.reportFrequency !== item.value,
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
  setEmails: (value: Subscriber[] | ((prevVar: Subscriber[]) => Subscriber[])) => void
}

const EmailList = ({ data, onRemove, setEmails }: EmailListProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const openRef = useRef<HTMLUListElement>(null)
  useOnClickOutside(openRef, () => setOpen(false))
  const { id, addedAt, isConfirmed, projectId, email, reportFrequency } = data || {}

  const changeRole = async (reportType: { value: string; label: string }) => {
    try {
      const results = await updateSubscriber(projectId, id, { reportFrequency: reportType.value })
      setEmails((prev) => {
        const newEmails = _map(prev, (item) => {
          if (item.id === results.id) {
            return results
          }
          return item
        })
        return newEmails
      })
      toast.success(t('apiNotifications.updatedPeriodEmailReports'))
    } catch (reason: any) {
      console.error(`[ERROR] Error while updating user's role: ${reason}`)
      toast.error(t('apiNotifications.updatedPeriodEmailReportsError'))
    }

    setOpen(false)
  }

  return (
    <tr className='dark:bg-slate-800'>
      <td className='py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6 dark:text-white'>
        {email}
      </td>
      <td className='px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white'>
        {language === 'en'
          ? dayjs(addedAt).locale(language).format('MMMM D, YYYY')
          : dayjs(addedAt).locale(language).format('D MMMM, YYYY')}
      </td>
      <td className='relative py-4 pr-2 text-right text-sm font-medium whitespace-nowrap'>
        {isConfirmed ? (
          <div>
            <button
              onClick={() => setOpen(!open)}
              type='button'
              className='inline-flex items-center rounded-full border border-gray-200 bg-white py-0.5 pr-1 pl-2 text-sm leading-5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-gray-600'
            >
              {t(`profileSettings.${_toLower(reportFrequency)}`)}
              <ChevronDownIcon style={{ transform: open ? 'rotate(180deg)' : '' }} className='ml-0.5 h-4 w-4 pt-px' />
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
                  <p className='font-bold text-red-600 dark:text-red-500'>{t('project.settings.removeMember')}</p>
                </li>
              </ul>
            ) : null}
          </div>
        ) : (
          <div className='flex items-center justify-end'>
            <Badge colour='yellow' className='mr-3' label={t('common.pending')} />
            <Button
              type='button'
              className='rounded-md bg-white text-base font-medium text-indigo-700 hover:bg-indigo-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              small
              onClick={onRemove}
            >
              <Trash2Icon className='h-4 w-4' strokeWidth={1.5} />
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
        <h2 className='mb-8 px-4 text-center text-xl leading-snug'>{t('project.settings.noPeople')}</h2>
      </div>
    </div>
  )
}

const Emails = ({ projectId }: { projectId: string }) => {
  const [showModal, setShowModal] = useState(false)
  const { t } = useTranslation('common')
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
  const [isDeleting, setIsDeleting] = useState(false)
  const [emailToRemove, setEmailToRemove] = useState<Subscriber | null>(null)

  const getSubcribersAsync = async () => {
    try {
      const { subscribers, count } = await getSubscribers(projectId, pagination.page - 1, pagination.limit)
      setPagination((oldPaggination) => ({
        ...oldPaggination,
        count,
      }))
      setEmails(subscribers)
    } catch (reason) {
      console.error(`[ERROR] Error while getting subscribers: ${reason}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getSubcribersAsync()
  }, []) // eslint-disable-line

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
      validate()
    }
  }, [form]) // eslint-disable-line

  const handleInput = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const onSubmit = async () => {
    setShowModal(false)
    setErrors({})
    setValidated(false)

    try {
      const results = await addSubscriber(projectId, { reportFrequency: form.reportFrequency, email: form.email })
      setEmails([...emails, results])
      toast.success(t('apiNotifications.userInvited'))
    } catch (reason) {
      console.error(`[ERROR] Error while inviting a user: ${reason}`)
      toast.error(t('apiNotifications.userInviteError'))
    }

    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(() => setForm({ email: '', reportFrequency: '' }), 300)
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
    // a timeout is needed to prevent the flicker of data fields in the modal when closing
    setTimeout(() => setForm({ email: '', reportFrequency: '' }), 300)
    setErrors({})
  }

  const onRemove = async (emailId: string) => {
    if (isDeleting) {
      return
    }

    setIsDeleting(true)

    try {
      await removeSubscriber(projectId, emailId)
      const results = _filter(emails, (s) => s.id !== emailId)
      setEmails(results)
      toast.success(t('apiNotifications.emailDelete'))
    } catch (reason: any) {
      console.error(`[ERROR] Error while deleting a email: ${reason}`)
      toast.error(t('apiNotifications.emailDeleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className='mt-6 mb-6'>
      <div className='mb-3 flex flex-col items-start justify-between gap-y-2 sm:flex-row sm:items-center'>
        <div>
          <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>{t('project.emails.title')}</h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{t('project.emails.description')}</p>
        </div>
        <Button className='h-8 pl-2 whitespace-nowrap' primary regular type='button' onClick={() => setShowModal(true)}>
          <>
            <MailPlusIcon className='mr-1 h-5 w-5' strokeWidth={1.5} />
            {t('project.emails.add')}
          </>
        </Button>
      </div>
      <div>
        <div className='mt-3 flex flex-col'>
          <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 md:overflow-x-visible lg:-mx-8'>
            <div className='inline-block min-w-full py-2 md:px-6 lg:px-8'>
              {!loading && !_isEmpty(emails) ? (
                <div className='ring-1 ring-black/10 md:rounded-lg'>
                  <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
                    <thead>
                      <tr className='dark:bg-slate-800'>
                        <th
                          scope='col'
                          className='py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-white'
                        >
                          {t('auth.common.email')}
                        </th>
                        <th
                          scope='col'
                          className='px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white'
                        >
                          {t('auth.common.addedOn')}
                        </th>
                        <th scope='col' />
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-300 dark:divide-gray-600'>
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
              ) : null}
              {_isEmpty(emails) ? <NoSubscribers /> : null}
              {loading ? <Loader /> : null}
            </div>
          </div>
        </div>
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
        message={<ModalMessage form={form} handleInput={handleInput} errors={errors} beenSubmitted={beenSubmitted} />}
        isOpened={showModal}
      />

      <Modal
        onClose={() => {
          setShowDeleteModal(false)
          setEmailToRemove(null)
        }}
        onSubmit={async () => {
          await onRemove(emailToRemove!.id)
          setEmailToRemove(null)
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
