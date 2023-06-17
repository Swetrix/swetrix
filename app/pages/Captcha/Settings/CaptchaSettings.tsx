/* eslint-disable react/forbid-prop-types */
import React, {
  useState, useEffect, useMemo, memo, useRef,
} from 'react'
import { useLocation, useNavigate, useParams } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import cx from 'clsx'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import _join from 'lodash/join'
import _isString from 'lodash/isString'
import _split from 'lodash/split'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import PropTypes from 'prop-types'
import { ExclamationTriangleIcon, TrashIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'

import { withAuthentication, auth } from 'hoc/protected'
import { isSelfhosted, TITLE_SUFFIX } from 'redux/constants'
import {
  createProject, updateProject, deleteCaptchaProject, resetCaptchaProject, reGenerateCaptchaSecretKey, getProjectsNames, createCaptchaInherited,
} from 'api'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import Modal from 'ui/Modal'
import Select from 'ui/Select'
import { trackCustom } from 'utils/analytics'
import routes from 'routesPath'
import { ICaptchaProject, IProject, IProjectNames } from 'redux/models/IProject'
import { IUser } from 'redux/models/IUser'

const MAX_NAME_LENGTH = 50
const MAX_ORIGINS_LENGTH = 300
const MAX_IPBLACKLIST_LENGTH = 300

const tabForCreateCaptcha = [{
  name: 'new',
  label: 'project.captcha.settings.general',
}, {
  name: 'inheritance',
  label: 'project.captcha.settings.inheritance',
}]

const tabForNew = 'new'
const tabForInheritance = 'inheritance'

// add to interface IProject new fields isCaptcha
interface IForm extends Partial<ICaptchaProject> {
  isCaptcha?: boolean
  id: string
  name: string
  origins?: string | null | string[]
  ipBlacklist?: string | null | string[]
}

const CaptchaSettings = ({
  updateProjectFailed, createNewProjectFailed, newProject, projectDeleted, deleteProjectFailed,
  loadProjects, isLoading, projects, showError, removeProject, user,
  deleteProjectCache, analyticsProjects,
}: {
  updateProjectFailed: (error: string) => void,
  createNewProjectFailed: (error: string) => void,
  newProject: (message: string) => void,
  projectDeleted: (message: string) => void,
  deleteProjectFailed: (error: string) => void,
  loadProjects: () => void,
  isLoading: boolean,
  projects: ICaptchaProject[],
  showError: (error: string) => void,
  removeProject: (pid: string) => void,
  user: IUser,
  deleteProjectCache: (pid: string) => void,
  analyticsProjects: IProject[],
}): JSX.Element => {
  const { t }: {
    t: (key: string, options?: {
      [key: string]: string | number | boolean | undefined
    }) => string,
  } = useTranslation('common')
  const { pathname } = useLocation()
  // @ts-ignore
  const { id }: {
    id: string,
  } = useParams()
  const project: ICaptchaProject | IProject = useMemo(() => _find([...projects, ...analyticsProjects], p => p.id === id) || {} as IProject | ICaptchaProject, [projects, analyticsProjects, id])
  const isSettings: boolean = !_isEmpty(id) && (_replace(routes.captcha_settings, ':id', id) === pathname)
  const navigate = useNavigate()
  const [form, setForm] = useState<IForm>({
    name: '',
    id,
    public: false,
    isCaptcha: true,
  })
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    name?: string,
    id?: string,
    origins?: string,
    ipBlacklist?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [showDelete, setShowDelete] = useState<boolean>(false)
  const [showReset, setShowReset] = useState<boolean>(false)
  const [projectDeleting, setProjectDeleting] = useState<boolean>(false)
  const [projectResetting, setProjectResetting] = useState<boolean>(false)
  const [projectSaving, setProjectSaving] = useState<boolean>(false)
  const [tab, setTab] = useState<string>(tabForCreateCaptcha[0].name)
  const [reuseProjectId, setReuseProjectId] = useState()
  const [allProjectsNames, setAllProjectsNames] = useState<IProjectNames[]>([])
  const [copied, setCopied] = useState(false)
  const [captchaSecretKey, setCaptchaSecretKey] = useState(project?.captchaSecretKey)
  const [showRegenerateSecret, setShowRegenerateSecret] = useState(false)
  const copyTimerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user.isActive && !isSelfhosted) {
      showError(t('project.captcha.settings.verify'))
      navigate(routes.dashboard)
    }

    if (!isLoading && isSettings && !projectDeleting) {
      if (_isEmpty(project) || project?.uiHidden) {
        showError(t('project.captcha.noExist'))
        navigate(routes.dashboard)
      } else {
        setForm({
          ...project,
          ipBlacklist: _isString(project.ipBlacklist) ? project.ipBlacklist : _join(project.ipBlacklist, ', '),
          origins: _isString(project.origins) ? project.origins : _join(project.origins, ', '),
        })
      }
    }
  }, [user, project, isLoading, isSettings, navigate, showError, projectDeleting, t])

  const onSubmit = async (data: IForm) => {
    if (!projectSaving) {
      setProjectSaving(true)
      try {
        const formalisedData: IForm = {
          ...data,
          origins: _isEmpty(data.origins) ? null : _map(_split(data.origins as string, ','), (origin) => {
            try {
              if (_includes(origin, 'localhost')) {
                return origin
              }
              return new URL(origin).host
            } catch (e) {
              return origin
            }
          }),
          ipBlacklist: _isEmpty(data.ipBlacklist) ? null : _split(data.ipBlacklist as string, ','),
        }
        if (isSettings) {
          await updateProject(id, formalisedData as ICaptchaProject)
          newProject(t('project.settings.updated'))
        } else {
          if (tab === tabForInheritance) {
            if (_isEmpty(reuseProjectId)) {
              showError('Select projects')
              return
            }
            await createCaptchaInherited(formalisedData.id)
          } else {
            await createProject({
              name: formalisedData.name,
              isCaptcha: true,
            })
          }
          trackCustom('CAPTCHA_CREATED')
          newProject(t('project.settings.created'))
        }

        loadProjects()
        navigate(routes.dashboard)
      } catch (e) {
        if (isSettings) {
          updateProjectFailed(e as string)
        } else {
          createNewProjectFailed(e as string)
        }
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
        removeProject(id)
        projectDeleted(t('project.settings.deleted'))
        navigate(routes.dashboard)
      } catch (e) {
        deleteProjectFailed(e as string)
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
        deleteProjectCache(id)
        projectDeleted(t('project.settings.resetted'))
        navigate(routes.dashboard)
      } catch (e) {
        deleteProjectFailed(e as string)
      } finally {
        setProjectResetting(false)
      }
    }
  }

  const validate = () => {
    const allErrors = {} as {
      name?: string,
      origins?: string,
      ipBlacklist?: string
    }

    if (_isEmpty(form.name) && tabForInheritance !== tab) {
      allErrors.name = t('project.settings.noNameError')
    }

    if (_size(form.name) > MAX_NAME_LENGTH && tabForInheritance !== tab) {
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
    const value = target.type === 'checkbox' ? target.checked : target.value

    setForm(oldForm => ({
      ...oldForm,
      [target.name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (tab === tabForInheritance) {
      const data = _find(allProjectsNames || analyticsProjects, (item) => `${item.name} | ${item.id}` === reuseProjectId)

      if (_isEmpty(data)) {
        showError('Select project or select corect project')
      }

      onSubmit({ ...data as IForm, isCaptcha: true })
      return
    }

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
  }, [form, t])

  const onRegenerateSecretKey = async () => {
    try {
      const res = await reGenerateCaptchaSecretKey(id)
      setCaptchaSecretKey(res)
    } catch (e) {
      showError(e as string)
    }
  }

  const setToClipboard = (value: string) => {
    if (!copied) {
      navigator.clipboard.writeText(value)
      setCopied(true)
      // @ts-ignore
      copyTimerRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }

  const getAllProjectsNames = async () => {
    await getProjectsNames()
      .then((res) => {
        setAllProjectsNames(res)
      }).catch((e) => {
        console.log(e)
      })
  }

  useEffect(() => {
    if (_isEmpty(allProjectsNames)) {
      getAllProjectsNames()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <div
      className={cx('min-h-min-footer bg-gray-50 dark:bg-slate-900 flex flex-col py-6 px-4 sm:px-6 lg:px-8', {
        'pb-40': isSettings,
      })}
    >
      <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
        <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>
          {title}
        </h2>
        <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
          {t('profileSettings.general')}
        </h3>
        <div className='mt-6'>
          {(!isSettings && _filter(allProjectsNames || analyticsProjects, (item) => !item?.isCaptchaProject).length > 0) && (
            <nav className='-mb-px flex space-x-8'>
              {_map(tabForCreateCaptcha, (tabCaptcha) => (
                <button
                  key={tabCaptcha.name}
                  type='button'
                  onClick={() => setTab(tabCaptcha.name)}
                  className={cx('whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-md', {
                    'border-indigo-500 text-indigo-600 dark:text-indigo-500': tab === tabCaptcha.name,
                    'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-300': tab !== tabCaptcha.name,
                  })}
                >
                  {t(tabCaptcha.label)}
                </button>
              ))}
            </nav>
          )}
        </div>
        {tab === tabForNew && (
          <Input
            name='name'
            id='name'
            type='text'
            label={t('project.captcha.settings.name')}
            value={form.name}
            placeholder='My awesome project'
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.name : null}
          />
        )}
        {tab === tabForInheritance && (
          <Select
            title={_isEmpty(reuseProjectId) ? 'select project' : reuseProjectId}
            label={t('profileSettings.selectProject')}
            className='w-full'
            items={_filter(allProjectsNames || analyticsProjects, (item) => !item.isCaptchaProject)}
            labelExtractor={(item) => `${item.name} | ${item.id}`}
            keyExtractor={(item) => item.id}
            onSelect={(item) => setReuseProjectId(item)}
          />
        )}
        {isSettings ? (
          <>
            <Input
              name='id'
              id='id'
              type='text'
              label={t('project.captcha.settings.pid')}
              value={form.id}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.id : null}
              disabled
            />
            <Input
              name='origins'
              id='origins'
              type='text'
              label={t('project.settings.origins')}
              hint={t('project.settings.originsHint')}
              value={form.origins as string || ''}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.origins : null}
            />
            <Input
              name='ipBlacklist'
              id='ipBlacklist'
              type='text'
              label={t('project.settings.ipBlacklist')}
              hint={t('project.settings.ipBlacklistHint')}
              value={form.ipBlacklist as string || ''}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.ipBlacklist : null}
              isBeta
            />
            <hr className='mt-5 border-gray-200 dark:border-gray-600' />
            <h3 className='flex items-center mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>
              {t('profileSettings.captchaSecretKey')}
            </h3>
            {captchaSecretKey ? (
              <>
                <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
                  {t('profileSettings.captchaSecretKeyHint')}
                </p>
                <p className='mt-4 max-w-prose text-base text-gray-900 dark:text-gray-50'>
                  {t('profileSettings.captchaSecretKey')}
                </p>
                <div className='grid grid-cols-1 gap-y-6 gap-x-4 lg:grid-cols-2'>
                  <div className='relative group'>
                    <Input
                      name='sercretKey'
                      id='sercretKey'
                      type='text'
                      className='pr-9'
                      value={captchaSecretKey}
                      onChange={handleInput}
                      disabled
                    />
                    <div className='absolute right-2 top-3'>
                      <div className='group relative'>
                        <Button
                          type='button'
                          onClick={() => setToClipboard(captchaSecretKey)}
                          className='opacity-70 hover:opacity-100'
                          noBorder
                        >
                          <>
                            <ClipboardDocumentIcon className='w-6 h-6' />
                            {copied && (
                              <div className='animate-appear bg-white dark:bg-slate-800 cursor-auto rounded p-1 absolute sm:top-0 top-0.5 right-8 text-xs text-green-600'>
                                {t('common.copied')}
                              </div>
                            )}
                          </>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className='max-w-prose text-base text-gray-900 dark:text-gray-50'>
                {t('profileSettings.noApiKey')}
              </p>
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
              onChange={handleInput}
              name='active'
              id='active'
              className='mt-4'
              label={t('project.captcha.settings.enabled')}
              hint={t('project.captcha.settings.enabledHint')}
            />
            <Checkbox
              checked={Boolean(form.public)}
              onChange={handleInput}
              name='public'
              id='public'
              className='mt-4'
              label={t('project.settings.public')}
              hint={t('project.settings.publicHint')}
            />
            <div className='flex justify-between mt-8 h-20 sm:h-min'>
              <div className='flex flex-wrap items-center'>
                <Button className='mr-2 border-indigo-100 dark:text-gray-50 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:bg-slate-700' onClick={onCancel} secondary regular>
                  {t('common.cancel')}
                </Button>
                <Button type='submit' loading={projectSaving} primary regular>
                  {t('common.save')}
                </Button>
              </div>
              <div className='flex flex-wrap items-center justify-end'>
                <Button onClick={() => !projectResetting && setShowReset(true)} loading={projectDeleting} semiDanger semiSmall>
                  <>
                    <TrashIcon className='w-5 h-5 mr-1' />
                    {t('project.settings.reset')}
                  </>
                </Button>
                <Button className='ml-2' onClick={() => !projectDeleting && setShowDelete(true)} loading={projectDeleting} danger semiSmall>
                  <>
                    <ExclamationTriangleIcon className='w-5 h-5 mr-1' />
                    {t('project.settings.delete')}
                  </>
                </Button>
              </div>
            </div>
            <hr className='mt-2 sm:mt-5 border-gray-200 dark:border-gray-600' />
          </>
        ) : (
          <p className='text-gray-500 dark:text-gray-300 italic mt-1 mb-4 text-sm'>
            {t('project.settings.createHint')}
          </p>
        )}

        {!isSettings && (
          <div>
            <Button className='mr-2 border-indigo-100 dark:text-gray-50 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:bg-slate-700' onClick={onCancel} secondary regular>
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

CaptchaSettings.propTypes = {
  updateProjectFailed: PropTypes.func.isRequired,
  createNewProjectFailed: PropTypes.func.isRequired,
  newProject: PropTypes.func.isRequired,
  projectDeleted: PropTypes.func.isRequired,
  deleteProjectFailed: PropTypes.func.isRequired,
  loadProjects: PropTypes.func.isRequired,
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  showError: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  user: PropTypes.object.isRequired,
  deleteProjectCache: PropTypes.func.isRequired,
}

export default memo(withAuthentication(CaptchaSettings, auth.authenticated))
