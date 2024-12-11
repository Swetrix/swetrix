import React, { useState, useEffect, memo } from 'react'
import { Link, useNavigate } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'
import _join from 'lodash/join'
import _isString from 'lodash/isString'
import _split from 'lodash/split'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import { ExclamationTriangleIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline'

import { withAuthentication, auth } from 'hoc/protected'
import { TITLE_SUFFIX } from 'lib/constants'
import {
  createProject,
  updateProject,
  deleteCaptchaProject,
  resetCaptchaProject,
  reGenerateCaptchaSecretKey,
  getProject,
} from 'api'
import Input from 'ui/Input'
import Loader from 'ui/Loader'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import Modal from 'ui/Modal'
import { trackCustom } from 'utils/analytics'
import routes from 'utils/routes'
import { CaptchaProject } from 'lib/models/Project'
import { useRequiredParams } from 'hooks/useRequiredParams'
import { useSelector } from 'react-redux'
import { StateType } from 'lib/store'

const MAX_NAME_LENGTH = 50
const MAX_ORIGINS_LENGTH = 300
const MAX_IPBLACKLIST_LENGTH = 300

interface Form extends Partial<CaptchaProject> {
  isCaptcha?: boolean
  id: string
  name: string
  origins?: string | null | string[]
  ipBlacklist?: string | null | string[]
}

interface CaptchaSettingsProps {
  isSettings: boolean
}

const CaptchaSettings = ({ isSettings }: CaptchaSettingsProps) => {
  const { loading: authLoading } = useSelector((state: StateType) => state.auth)

  const { t } = useTranslation('common')
  const { id } = useRequiredParams<{
    id: string
  }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>({
    name: '',
    id,
    public: false,
    isCaptcha: true,
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    id?: string
    origins?: string
    ipBlacklist?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [projectDeleting, setProjectDeleting] = useState(false)
  const [projectResetting, setProjectResetting] = useState(false)
  const [projectSaving, setProjectSaving] = useState(false)
  const [captchaSecretKey, setCaptchaSecretKey] = useState<string | null>(null)
  const [showRegenerateSecret, setShowRegenerateSecret] = useState(false)

  const [project, setProject] = useState<CaptchaProject | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProject = async (projectId: string) => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const result = (await getProject(projectId)) as CaptchaProject
      setProject(result)
      setCaptchaSecretKey(result.captchaSecretKey)
      setForm({
        ...result,
        ipBlacklist: _isString(result.ipBlacklist) ? result.ipBlacklist : _join(result.ipBlacklist, ', '),
        origins: _isString(result.origins) ? result.origins : _join(result.origins, ', '),
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

    loadProject(id)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, id])

  const onSubmit = async (data: Form) => {
    if (!projectSaving) {
      setProjectSaving(true)
      try {
        const formalisedData: Form = {
          ...data,
          origins: _isEmpty(data.origins)
            ? null
            : _map(_split(data.origins as string, ','), (origin) => {
                try {
                  if (_includes(origin, 'localhost')) {
                    return origin
                  }
                  return new URL(origin).host
                } catch {
                  return origin
                }
              }),
          ipBlacklist: _isEmpty(data.ipBlacklist) ? null : _split(data.ipBlacklist as string, ','),
        }
        if (isSettings) {
          await updateProject(id, formalisedData as CaptchaProject)
          toast.success(t('project.settings.updated'))
        } else {
          await createProject({
            name: formalisedData.name,
            isCaptcha: true,
          })
          trackCustom('CAPTCHA_CREATED')
          toast.success(t('project.settings.created'))
        }

        navigate(routes.dashboard)
      } catch (reason: any) {
        toast.error(reason)
      } finally {
        setProjectSaving(false)
      }
    }
  }

  const onDelete = async () => {
    setShowDelete(false)
    if (!projectDeleting) {
      setProjectDeleting(true)
      try {
        await deleteCaptchaProject(id)
        toast.success(t('project.settings.deleted'))
        navigate(routes.dashboard)
      } catch (reason: any) {
        toast.error(reason)
      } finally {
        setProjectDeleting(false)
      }
    }
  }

  const onReset = async () => {
    setShowReset(false)
    if (!projectResetting) {
      setProjectResetting(true)
      try {
        await resetCaptchaProject(id)
        toast.success(t('project.settings.resetted'))
        navigate(routes.dashboard)
      } catch (reason: any) {
        toast.error(reason)
      } finally {
        setProjectResetting(false)
      }
    }
  }

  const validate = () => {
    const allErrors = {} as {
      name?: string
      origins?: string
      ipBlacklist?: string
    }

    if (_isEmpty(form.name)) {
      allErrors.name = t('project.settings.noNameError')
    }

    if (_size(form.name) > MAX_NAME_LENGTH) {
      allErrors.name = t('project.settings.pxCharsError', { amount: MAX_NAME_LENGTH })
    }

    if (_size(form.origins) > MAX_ORIGINS_LENGTH) {
      allErrors.origins = t('project.settings.oxCharsError', { amount: MAX_ORIGINS_LENGTH })
    }

    if (_size(form.ipBlacklist) > MAX_IPBLACKLIST_LENGTH) {
      allErrors.ipBlacklist = t('project.settings.oxCharsError', { amount: MAX_IPBLACKLIST_LENGTH })
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

    setForm((oldForm) => ({
      ...oldForm,
      [target.name]: target.value,
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
    navigate(isSettings ? _replace(routes.captcha, ':id', id) : routes.dashboard)
  }

  const title = isSettings ? `${t('project.settings.settings')} ${form.name}` : t('project.settings.create')

  useEffect(() => {
    let pageTitle = isSettings ? `${t('project.settings.settings')} ${form.name}` : t('project.settings.create')
    pageTitle += ` ${TITLE_SUFFIX}`

    document.title = pageTitle
  }, [form, t, isSettings])

  const onRegenerateSecretKey = async () => {
    try {
      const res = await reGenerateCaptchaSecretKey(id)
      setCaptchaSecretKey(res)
    } catch (reason: any) {
      toast.error(reason)
    }
  }

  if (isLoading || isLoading === null || !project) {
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
    <div
      className={cx('flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8', {
        'pb-40': isSettings,
      })}
    >
      <form className='mx-auto w-full max-w-7xl' onSubmit={handleSubmit}>
        <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{title}</h2>
        <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>{t('profileSettings.general')}</h3>
        <Input
          name='name'
          label={t('project.captcha.settings.name')}
          value={form.name}
          placeholder='My awesome project'
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.name : null}
        />
        {isSettings ? (
          <>
            <Input
              name='id'
              label={t('project.captcha.settings.pid')}
              value={form.id}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.id : null}
              disabled
            />
            <Input
              name='origins'
              label={t('project.settings.origins')}
              hint={t('project.settings.originsHint')}
              value={(form.origins as string) || ''}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.origins : null}
            />
            <Input
              name='ipBlacklist'
              label={t('project.settings.ipBlacklist')}
              hint={t('project.settings.ipBlacklistHint')}
              value={(form.ipBlacklist as string) || ''}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.ipBlacklist : null}
              isBeta
            />
            <hr className='mt-5 border-gray-200 dark:border-gray-600' />
            <h3 className='mt-2 flex items-center text-lg font-bold text-gray-900 dark:text-gray-50'>
              {t('profileSettings.captchaSecretKey')}
            </h3>
            {captchaSecretKey ? (
              <>
                <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
                  {t('profileSettings.captchaSecretKeyHint')}
                </p>
                <div className='grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2'>
                  <Input
                    label={t('profileSettings.captchaSecretKey')}
                    name='sercretKey'
                    className='mt-4'
                    value={captchaSecretKey}
                    disabled
                  />
                </div>
              </>
            ) : (
              <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>{t('profileSettings.noApiKey')}</p>
            )}
            {captchaSecretKey ? (
              <Button className='mt-4' onClick={() => setShowRegenerateSecret(true)} danger large>
                {t('profileSettings.regenerateSecretKey')}
              </Button>
            ) : (
              <Button className='mt-4' onClick={onRegenerateSecretKey} primary large>
                {t('profileSettings.generateSecretKey')}
              </Button>
            )}
            <hr className='mt-5 border-gray-200 dark:border-gray-600' />
            <Checkbox
              checked={Boolean(form.active)}
              onChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  active: checked,
                }))
              }
              name='active'
              className='mt-4'
              label={t('project.captcha.settings.enabled')}
              hint={t('project.captcha.settings.enabledHint')}
            />
            <Checkbox
              checked={Boolean(form.public)}
              onChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  public: checked,
                }))
              }
              name='public'
              className='mt-4'
              label={t('project.settings.public')}
              hint={t('project.settings.publicHint')}
            />
            <div className='mt-8 flex flex-wrap justify-center gap-2 sm:justify-between'>
              <div className='flex flex-wrap items-center justify-center gap-2'>
                <Button
                  className='border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
                  onClick={onCancel}
                  secondary
                  regular
                >
                  {t('common.cancel')}
                </Button>
                <Button type='submit' loading={projectSaving} primary regular>
                  {t('common.save')}
                </Button>
              </div>
              <div className='flex flex-wrap items-center justify-center gap-2'>
                <Button
                  onClick={() => !projectResetting && setShowReset(true)}
                  loading={projectDeleting}
                  semiDanger
                  semiSmall
                >
                  <>
                    <TrashIcon className='mr-1 h-5 w-5' />
                    {t('project.settings.reset')}
                  </>
                </Button>
                <Button
                  onClick={() => !projectDeleting && setShowDelete(true)}
                  loading={projectDeleting}
                  danger
                  semiSmall
                >
                  <>
                    <ExclamationTriangleIcon className='mr-1 h-5 w-5' />
                    {t('project.settings.delete')}
                  </>
                </Button>
              </div>
            </div>
            <hr className='mt-2 border-gray-200 dark:border-gray-600 sm:mt-5' />
          </>
        ) : (
          <p className='mb-4 mt-1 text-sm italic text-gray-500 dark:text-gray-300'>
            {t('project.settings.createHint')}
          </p>
        )}

        {!isSettings && (
          <div>
            <Button
              className='mr-2 border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              onClick={onCancel}
              secondary
              regular
            >
              {t('common.cancel')}
            </Button>
            <Button type='submit' loading={projectSaving} primary regular>
              {t('common.save')}
            </Button>
          </div>
        )}
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
        onClose={() => setShowReset(false)}
        onSubmit={onReset}
        submitText={t('project.settings.reset')}
        closeText={t('common.close')}
        title={t('project.settings.qReset')}
        message={t('project.settings.resetHint')}
        submitType='danger'
        type='error'
        isOpened={showReset}
      />
      <Modal
        onClose={() => setShowRegenerateSecret(false)}
        onSubmit={() => {
          setShowRegenerateSecret(false)
          onRegenerateSecretKey()
        }}
        submitText={t('profileSettings.regenerateSecretKey')}
        closeText={t('common.close')}
        title={t('profileSettings.regenerateSecretKeyTitle')}
        submitType='danger'
        type='error'
        message={t('profileSettings.regenerateSecretKeyMessage')}
        isOpened={showRegenerateSecret}
      />
    </div>
  )
}

export default memo(withAuthentication(CaptchaSettings, auth.authenticated))
