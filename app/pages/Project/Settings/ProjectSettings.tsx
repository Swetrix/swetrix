/* eslint-disable react/forbid-prop-types */
import React, {
  useState, useEffect, useMemo, memo,
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
import _filter from 'lodash/filter'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import PropTypes from 'prop-types'
import { ExclamationTriangleIcon, TrashIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'

import { withAuthentication, auth } from 'hoc/protected'
import {
  isSelfhosted, TITLE_SUFFIX, ENTRIES_PER_PAGE_DASHBOARD, FILTERS_PANELS_ORDER,
} from 'redux/constants'
import { IProject } from 'redux/models/IProject'
import { IUser } from 'redux/models/IUser'
import { IProjectForShared, ISharedProject } from 'redux/models/ISharedProject'
import {
  createProject, updateProject, deleteProject, resetProject, transferProject, deletePartially, getFilters, resetFilters,
} from 'api'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import Modal from 'ui/Modal'
import FlatPicker from 'ui/Flatpicker'
import { trackCustom } from 'utils/analytics'
import routes from 'routesPath'
import Dropdown from 'ui/Dropdown'
import MultiSelect from 'ui/MultiSelect'
import { getFormatDate } from '../View/ViewProject.helpers'

import People from './People'
import Emails from './Emails'

const MAX_NAME_LENGTH = 50
const MAX_ORIGINS_LENGTH = 300
const MAX_IPBLACKLIST_LENGTH = 300

const tabDeleteDataModal = [
  {
    name: 'all',
    title: 'project.settings.reseted.all',
  },
  {
    name: 'partially',
    title: 'project.settings.reseted.partially',
  },
  {
    name: 'viaFilters',
    title: 'project.settings.reseted.viaFilters',
  },
]

const ModalMessage = ({
  dateRange, setDateRange, setTab, t, tab, pid, activeFilter, setActiveFilter, filterType, setFilterType,
}: {
  dateRange: Date[],
  setDateRange: (a: Date[]) => void,
  setTab: (i: string) => void,
  t: (key: string, options?: {
    [key: string]: string | number | null
  }) => string,
  tab: string,
  pid: string,
  activeFilter: string[]
  setActiveFilter: any,
  filterType: string,
  setFilterType: (a: string) => void,
}): JSX.Element => {
  const [filterList, setFilterList] = useState<string[]>([])

  const getFiltersList = async () => {
    if (!_isEmpty(filterType)) {
      const res = await getFilters(pid, filterType)
      setFilterList(res)
      if (!_isEmpty(activeFilter)) {
        setActiveFilter([])
      }
    }
  }

  useEffect(() => {
    getFiltersList()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType])

  return (
    <>
      <p className='text-gray-500 dark:text-gray-300 italic mt-1 mb-4 text-sm'>
        {t('project.settings.resetHint')}
      </p>
      <div className='mt-6'>
        <nav className='-mb-px flex space-x-6'>
          {_map(tabDeleteDataModal, (tabDelete) => (
            <button
              key={tabDelete.name}
              type='button'
              onClick={() => setTab(tabDelete.name)}
              className={cx('whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-md', {
                'border-indigo-500 text-indigo-600 dark:text-gray-50 dark:border-gray-50': tabDelete.name === tab,
                'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-300': tab !== tabDelete.name,
              })}
            >
              {t(tabDelete.title)}
            </button>
          ))}
        </nav>
      </div>
      {tab === tabDeleteDataModal[1].name && (
      <>
        <p className='text-gray-500 dark:text-gray-300 mt-4 mb-2 text-sm'>
          {t('project.settings.reseted.partiallyDesc')}
        </p>
        <p className='text-gray-500 dark:text-gray-300 italic mt-1 mb-2 text-sm'>
          {t('project.settings.reseted.partiallyHint')}
        </p>
        <input type='text' className='h-0 w-0 border-0 p-0 m-0 focus:text-transparent focus:border-transparent focus:shadow-none focus:ring-transparent' />
        <FlatPicker
          onChange={(date) => setDateRange(date)}
          options={{
            altInputClass: 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:text-gray-50 dark:placeholder-gray-400 dark:border-gray-800 dark:bg-slate-800 rounded-md',
          }}
          value={dateRange}
        />
      </>
      )}
      {tab === tabDeleteDataModal[0].name && (
        <p className='text-gray-500 dark:text-gray-300 italic mt-4 mb-4 text-sm'>
          {t('project.settings.reseted.allHint')}
        </p>
      )}
      {tab === tabDeleteDataModal[2].name && (
        <div className='min-h-[410px]'>
          <p className='text-gray-500 dark:text-gray-300 italic mt-4 mb-4 text-sm'>
            {t('project.settings.reseted.viaFiltersHint')}
          </p>
          <div>
            <Dropdown
              className='min-w-[160px]'
              title={!_isEmpty(filterType) ? t(`project.mapping.${filterType}`) : t('project.settings.reseted.selectFilters')}
              items={FILTERS_PANELS_ORDER}
              labelExtractor={(item) => t(`project.mapping.${item}`)}
              keyExtractor={(item) => item}
              onSelect={(item) => setFilterType(item)}
            />
            <div className='h-2' />
            {(filterType && !_isEmpty(filterList)) ? (
              <MultiSelect
                className='w-full max-w-[400px]'
                items={filterList}
                labelExtractor={(item) => item}
                keyExtractor={(item) => item}
                label={activeFilter}
                placholder={t('project.settings.reseted.filterPlaceholder')}
                onSelect={(item: string) => setActiveFilter((oldItems: string[]) => [...oldItems, item])}
                onRemove={(item: string) => setActiveFilter((oldItems: string[]) => _filter(oldItems, (i) => i !== item))}
              />
            ) : (
              <p className='text-gray-500 dark:text-gray-300 italic mt-4 mb-4 text-sm'>
                {t('project.settings.reseted.noFilters')}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

interface IForm extends Partial<IProject> {
  origins: string | null,
  ipBlacklist: string | null,
}

const DEFAULT_PROJECT_NAME = 'Untitled Project'

const ProjectSettings = ({
  updateProjectFailed, createNewProjectFailed, generateAlerts, projectDeleted, deleteProjectFailed,
  loadProjects, isLoading, projects, showError, removeProject, user, isSharedProject, sharedProjects,
  deleteProjectCache, setProjectProtectedPassword, dashboardPaginationPage, dashboardPaginationPageShared,
}: {
  updateProjectFailed: (message: string) => void,
  createNewProjectFailed: (message: string) => void,
  generateAlerts: (message: string) => void,
  projectDeleted: (message: string) => void,
  deleteProjectFailed: (message: string) => void,
  loadProjects: (shared: boolean, skip: number) => void,
  isLoading: boolean,
  projects: IProject[],
  showError: (message: string) => void,
  removeProject: (pid: string, shared: boolean) => void,
  user: IUser,
  isSharedProject: boolean,
  sharedProjects: ISharedProject[],
  deleteProjectCache: (pid: string) => void,
  setProjectProtectedPassword: (pid: string, password: string) => void,
  dashboardPaginationPage: number,
  dashboardPaginationPageShared: number,
}) => {
  const { t }: {
    t: (key: string, options?: {
      [key: string]: string | number | null
    }) => string,
  } = useTranslation('common')
  const { pathname } = useLocation()
  // @ts-ignore
  const { id }: {
    id: string,
  } = useParams()
  const project: IProjectForShared = useMemo(() => _find([...projects, ..._map(sharedProjects, (item) => item.project)], p => p.id === id) || {} as IProjectForShared, [projects, id, sharedProjects])
  const isSettings: boolean = !_isEmpty(id) && (_replace(routes.project_settings, ':id', id) === pathname)
  const navigate = useNavigate()

  const [form, setForm] = useState<IForm>({
    name: '',
    id,
    public: false,
    origins: null,
    ipBlacklist: null,
  })
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    name?: string,
    origins?: string,
    ipBlacklist?: string,
    password?: string,
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [showDelete, setShowDelete] = useState<boolean>(false)
  const [showReset, setShowReset] = useState<boolean>(false)
  const [projectDeleting, setProjectDeleting] = useState<boolean>(false)
  const [projectResetting, setProjectResetting] = useState<boolean>(false)
  const [projectSaving, setProjectSaving] = useState<boolean>(false)
  const [showTransfer, setShowTransfer] = useState<boolean>(false)
  const [transferEmail, setTransferEmail] = useState<string>('')
  const [dateRange, setDateRange] = useState<Date[]>([])
  const [tab, setTab] = useState<string>(tabDeleteDataModal[0].name)
  const [showProtected, setShowProtected] = useState<boolean>(false)

  // for reset data via filters
  const [activeFilter, setActiveFilter] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string>('')

  const paginationSkip: number = isSharedProject ? dashboardPaginationPageShared * ENTRIES_PER_PAGE_DASHBOARD : dashboardPaginationPage * ENTRIES_PER_PAGE_DASHBOARD

  useEffect(() => {
    if (!user.isActive && !isSelfhosted) {
      showError(t('project.settings.verify'))
      navigate(routes.dashboard)
    }

    if (!isLoading && isSettings && !projectDeleting) {
      if (_isEmpty(project) || project?.uiHidden) {
        showError(t('project.noExist'))
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
        const formalisedData = {
          ...data,
          origins: _isEmpty(data.origins) ? null : _map(_split(data.origins, ','), (origin) => {
            try {
              if (_includes(origin, 'localhost')) {
                return origin
              }
              return new URL(origin).host
            } catch (e) {
              return origin
            }
          }),
          ipBlacklist: _isEmpty(data.ipBlacklist) ? null : _split(data.ipBlacklist, ','),
        }
        if (isSettings) {
          await updateProject(id, formalisedData as Partial<IProject>)
          generateAlerts(t('project.settings.updated'))
        } else {
          await createProject({
            name: data.name || DEFAULT_PROJECT_NAME,
          })
          trackCustom('PROJECT_CREATED')
          navigate(routes.dashboard)
          generateAlerts(t('project.settings.created'))
        }

        loadProjects(isSharedProject, paginationSkip)
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
        await deleteProject(id)
        removeProject(id, isSharedProject)
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
        if (tab === tabDeleteDataModal[1].name) {
          if (_isEmpty(dateRange)) {
            deleteProjectFailed(t('project.settings.noDateRange'))
            setProjectResetting(false)
            return
          }
          await deletePartially(id, {
            from: getFormatDate(dateRange[0]),
            to: getFormatDate(dateRange[1]),
          })
        } else if (tab === tabDeleteDataModal[2].name) {
          if (_isEmpty(activeFilter)) {
            deleteProjectFailed(t('project.settings.noFilters'))
            setProjectResetting(false)
            return
          }

          await resetFilters(id, filterType, activeFilter)
        } else {
          await resetProject(id)
        }
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
    const allErrors: {
      name?: string,
      origins?: string,
      ipBlacklist?: string,
      password?: string,
    } = {}

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

    if (validated) {
      onSubmit(form)
    }
  }

  const onCancel = () => {
    navigate(isSettings ? _replace(routes.project, ':id', id) : routes.dashboard)
  }

  const onTransfer = async () => {
    await transferProject(id, transferEmail)
      .then(() => {
        generateAlerts(t('apiNotifications.transferRequestSent'))
        navigate(routes.dashboard)
      })
      .catch((e) => {
        showError(e as string)
      })
      .finally(() => {
        setShowTransfer(false)
        setTransferEmail('')
      })
  }

  const onProtected = () => {
    setBeenSubmitted(true)

    if (validated) {
      onSubmit({
        ...form,
        isPasswordProtected: true,
      })

      if (!_isEmpty(form.password) && !_isEmpty(form.id)) {
        setProjectProtectedPassword(form?.id || '', form?.password || '')
      }

      setShowProtected(false)
    }
  }

  const title = isSettings ? `${t('project.settings.settings')} ${form.name}` : t('project.settings.create')

  useEffect(() => {
    let pageTitle = isSettings ? `${t('project.settings.settings')} ${form.name}` : t('project.settings.create')
    pageTitle += ` ${TITLE_SUFFIX}`

    document.title = pageTitle
  }, [form, t, isSettings])

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
        <Input
          name='name'
          id='name'
          type='text'
          label={t('project.settings.name')}
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
              id='id'
              type='text'
              label={t('project.settings.pid')}
              value={form.id}
              className='mt-4'
              onChange={handleInput}
              error={null}
              disabled
            />
            <Input
              name='origins'
              id='origins'
              type='text'
              label={t('project.settings.origins')}
              hint={t('project.settings.originsHint')}
              value={form.origins || ''}
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
              value={form.ipBlacklist || ''}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.ipBlacklist : null}
            />
            <Checkbox
              checked={Boolean(form.active)}
              onChange={handleInput}
              name='active'
              id='active'
              className='mt-4'
              label={t('project.settings.enabled')}
              hint={t('project.settings.enabledHint')}
            />
            <Checkbox
              checked={Boolean(form.public)}
              onChange={(e) => {
                if (!form.isPasswordProtected) {
                  handleInput(e)
                }
              }}
              disabled={form?.isPasswordProtected}
              name='public'
              id='public'
              className='mt-4'
              label={t('project.settings.public')}
              hint={t('project.settings.publicHint')}
            />
            {!isSelfhosted && (
            <Checkbox
              checked={Boolean(form.isPasswordProtected)}
              onChange={() => {
                if (!form.public && form.isPasswordProtected) {
                  setForm({
                    ...form,
                    isPasswordProtected: false,
                  })
                  return
                }

                if (!form.public) {
                  setShowProtected(true)
                }
              }}
              disabled={form?.public}
              name='isPasswordProtected'
              id='isPasswordProtected'
              className='mt-4'
              label={t('project.settings.protected')}
              hint={t('project.settings.protectedHint')}
            />
            )}
            <div className='flex justify-between mt-8 h-20 sm:h-min'>
              <div className='flex flex-wrap items-center'>
                <Button className='mr-2 border-indigo-100 dark:text-gray-50 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:bg-slate-700' onClick={onCancel} secondary regular>
                  {t('common.cancel')}
                </Button>
                <Button type='submit' loading={projectSaving} primary regular>
                  {t('common.save')}
                </Button>
              </div>
              {!project?.shared && (
              <div className='flex flex-wrap items-center justify-end'>
                {!isSelfhosted && (
                <Button className='mr-2' onClick={() => setShowTransfer(true)} semiDanger semiSmall>
                  <>
                    <RocketLaunchIcon className='w-5 h-5 mr-1' />
                    {t('project.settings.transfer')}
                  </>
                </Button>
                )}
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
              )}
            </div>
            {!isSelfhosted && !project?.shared && (
            <>
              <hr className='mt-8 xs:mt-2 sm:mt-5 border-gray-200 dark:border-gray-600' />
              <Emails projectId={id} projectName={project.name} />
            </>
            )}
            {!isSelfhosted && !project?.shared && (
            <>
              <hr className='mt-2 sm:mt-5 border-gray-200 dark:border-gray-600' />
              <People project={project} />
            </>
            )}
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
        size='large'
        submitText={t('project.settings.reset')}
        closeText={t('common.close')}
        title={t('project.settings.qReset')}
        message={<ModalMessage setDateRange={setDateRange} dateRange={dateRange} setTab={setTab} tab={tab} t={t} pid={id} activeFilter={activeFilter} setActiveFilter={setActiveFilter} filterType={filterType} setFilterType={setFilterType} />}
        submitType='danger'
        type='error'
        isOpened={showReset}
      />
      <Modal
        onClose={() => setShowProtected(false)}
        onSubmit={onProtected}
        submitText={t('common.save')}
        closeText={t('common.cancel')}
        title={t('project.settings.protected')}
        message={(
          <div>
            <p className='text-gray-500 dark:text-gray-300 italic mt-1 mb-4 text-sm'>
              {t('project.settings.protectedHint')}
            </p>
            <Input
              name='password'
              id='password'
              type='password'
              label={t('project.settings.password')}
              value={form?.password || ''}
              placeholder={t('project.settings.password')}
              className='mt-4'
              onChange={handleInput}
              error={beenSubmitted ? errors.password : null}
            />
          </div>
          )}
        isOpened={showProtected}
      />
      <Modal
        onClose={() => {
          setShowTransfer(false)
        }}
        submitText={t('project.settings.transfer')}
        closeText={t('common.cancel')}
        message={(
          <div>
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>
              {t('project.settings.transferTo')}
            </h2>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t('project.settings.transferHint', {
                name: form.name || DEFAULT_PROJECT_NAME,
              })}
            </p>
            <Input
              name='email'
              id='email'
              type='email'
              label={t('project.settings.transfereeEmail')}
              value={transferEmail}
              placeholder='you@example.com'
              className='mt-4'
              onChange={(e) => setTransferEmail(e.target.value)}
            />
          </div>
          )}
        isOpened={showTransfer}
        onSubmit={onTransfer}
      />
    </div>
  )
}

ProjectSettings.propTypes = {
  updateProjectFailed: PropTypes.func.isRequired,
  createNewProjectFailed: PropTypes.func.isRequired,
  generateAlerts: PropTypes.func.isRequired,
  projectDeleted: PropTypes.func.isRequired,
  deleteProjectFailed: PropTypes.func.isRequired,
  loadProjects: PropTypes.func.isRequired,
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  showError: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  user: PropTypes.object.isRequired,
  isSharedProject: PropTypes.bool.isRequired,
  deleteProjectCache: PropTypes.func.isRequired,
}

export default memo(withAuthentication(ProjectSettings, auth.authenticated))
