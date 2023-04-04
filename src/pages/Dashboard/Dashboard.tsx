/* eslint-disable react/forbid-prop-types */
import React, {
  memo, useState, useEffect, useMemo,
} from 'react'
import { Link, useHistory } from 'react-router-dom'
import cx from 'clsx'
import dayjs from 'dayjs'
import PropTypes from 'prop-types'
import _isEmpty from 'lodash/isEmpty'
import _isNumber from 'lodash/isNumber'
import _replace from 'lodash/replace'
import _map from 'lodash/map'
import _isUndefined from 'lodash/isUndefined'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import { useTranslation } from 'react-i18next'
import { EyeIcon, CalendarIcon, FolderPlusIcon } from '@heroicons/react/24/outline'
import { ArrowSmallUpIcon, ArrowSmallDownIcon, XCircleIcon } from '@heroicons/react/24/solid'

import Modal from 'ui/Modal'
import Select from 'ui/Select'
import _includes from 'lodash/includes'
import _values from 'lodash/values'
import { withAuthentication, auth } from 'hoc/protected'
import Title from 'components/Title'
import Loader from 'ui/Loader'
import { ActivePin, InactivePin, WarningPin } from 'ui/Pin'
import PulsatingCircle from 'ui/icons/PulsatingCircle'
import routes from 'routes'
import {
  isSelfhosted, ENTRIES_PER_PAGE_DASHBOARD, tabForOwnedProject, tabForSharedProject, tabForCaptchaProject, DASHBOARD_TABS, tabsForDashboard,
} from 'redux/constants'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'

import { acceptShareProject } from 'api'

import Pagination from 'ui/Pagination'
import { ISharedProject } from 'redux/models/ISharedProject'
import { IProject, IOvervallObject, ICaptchaProject } from 'redux/models/IProject'
import { IUser } from 'redux/models/IUser'

const DASHBOARD_TABS_VALUES = _values(DASHBOARD_TABS)

interface IProjectCart {
  name?: string
  created?: string
  active?: boolean
  overall?: IOvervallObject
  t: (key: string, options?: {
    [key: string]: string | number | null | undefined
  }) => string
  language: string
  live?: string | number
  isPublic?: boolean
  confirmed?: boolean
  id?: string
  deleteProjectFailed: (message: string) => void
  sharedProjects: ISharedProject[]
  setProjectsShareData: (data: Partial<ISharedProject>, id: string, shared?: boolean) => void
  setUserShareData: (data: Partial<ISharedProject>, id: string) => void
  shared?: boolean
  userSharedUpdate: (message: string) => void
  sharedProjectError: (message: string) => void
  captcha?: boolean
}

const ProjectCart = ({
  name, created, active, overall, t, language, live, isPublic, confirmed, id, deleteProjectFailed,
  sharedProjects, setProjectsShareData, setUserShareData, shared, userSharedUpdate, sharedProjectError,
  captcha,
}: IProjectCart): JSX.Element => {
  const statsDidGrowUp = overall?.percChange ? overall?.percChange >= 0 : false
  const [showInviteModal, setShowInviteModal] = useState(false)

  const onAccept = async () => {
    // @ts-ignore
    const pid: string = _find(sharedProjects, (item: ISharedProject) => item.project && item.project.id === id)?.id

    try {
      if (!pid || !id) {
        throw new Error('Project not found')
      }
      await acceptShareProject(pid)
      setProjectsShareData({ confirmed: true }, id, true)
      setUserShareData({ confirmed: true }, pid)
      userSharedUpdate(t('apiNotifications.acceptInvitation'))
    } catch (e) {
      sharedProjectError(t('apiNotifications.acceptInvitationError'))
      // @ts-ignore
      deleteProjectFailed(e)
    }
  }

  return (
    <li>
      <div onClick={() => !confirmed && setShowInviteModal(true)} className='block cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-700'>
        <div className='px-4 py-4 sm:px-6'>
          <div className='flex items-center justify-between'>
            <p className='text-lg font-medium text-indigo-600 dark:text-gray-50 truncate'>
              {name}
            </p>
            <div className='ml-2 flex-shrink-0 flex'>
              {
                shared && (
                  confirmed ? (
                    <ActivePin className='mr-2' label={t('dashboard.shared')} />
                  ) : (
                    <WarningPin className='mr-2' label={t('common.pending')} />
                  )
                )
              }
              {active ? (
                <ActivePin label={t('dashboard.active')} />
              ) : (
                <InactivePin label={t('dashboard.disabled')} />
              )}
              {isPublic && (
                <ActivePin label={t('dashboard.public')} className='ml-2' />
              )}
            </div>
          </div>
          <div className='mt-2 sm:flex sm:justify-between'>
            <div className='sm:flex flex-col'>
              {overall && (
                <div className='flex items-center mt-2 text-sm text-gray-500 dark:text-gray-300'>
                  <EyeIcon className='flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-300' />
                  {t('dashboard.pageviews')}
                  :
                  &nbsp;
                  <dd className='flex items-baseline'>
                    <p className='h-5 mr-1'>
                      {overall?.thisWeek}
                    </p>
                    <p
                      className={cx('flex text-xs -ml-1 items-baseline', {
                        'text-green-600': statsDidGrowUp,
                        'text-red-600': !statsDidGrowUp,
                      })}
                    >
                      {statsDidGrowUp ? (
                        <>
                          <ArrowSmallUpIcon className='self-center flex-shrink-0 h-4 w-4 text-green-500' />
                          <span className='sr-only'>
                            {t('dashboard.inc')}
                          </span>
                        </>
                      ) : (
                        <>
                          <ArrowSmallDownIcon className='self-center flex-shrink-0 h-4 w-4 text-red-500' />
                          <span className='sr-only'>
                            {t('dashboard.dec')}
                          </span>
                        </>
                      )}
                      {overall?.percChange}
                      %
                    </p>
                  </dd>
                </div>
              )}
              {!captcha && (
                <div className='mt-2 flex items-center text-sm text-gray-500 dark:text-gray-300 sm:mt-0'>
                  <PulsatingCircle className='flex-shrink-0 mr-3 ml-1' />
                  {t('dashboard.liveVisitors')}
                  :&nbsp;
                  {live}
                </div>
              )}
            </div>
            <div className='mt-2 flex items-center text-sm text-gray-500 dark:text-gray-300'>
              <CalendarIcon className='flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-300' />
              <p>
                {t('dashboard.createdAt')}
                &nbsp;
                <time dateTime={dayjs(created).format('YYYY-MM-DD')}>
                  {language === 'en'
                    ? dayjs(created).locale(language).format('MMMM D, YYYY')
                    : dayjs(created).locale(language).format('D MMMM, YYYY')}
                </time>
              </p>
            </div>
          </div>
        </div>
      </div>
      {
        !confirmed && (
          <Modal
            onClose={() => { setShowInviteModal(false) }}
            onSubmit={() => { setShowInviteModal(false); onAccept() }}
            submitText={t('common.accept')}
            type='confirmed'
            closeText={t('common.cancel')}
            title={t('dashboard.invitationFor', { project: name })}
            message={t('dashboard.invitationDesc', { project: name })}
            isOpened={showInviteModal}
          />
        )
      }
    </li>
  )
}

ProjectCart.defaultProps = {
  isPublic: false,
  created: '',
  overall: {
    percChange: 0,
    total: 0,
    thisWeek: 0,
  },
  active: false,
  shared: false,
  captcha: false,
  confirmed: false,
  id: '',
  name: '',
  live: 'N/A',
}

const NoProjects = ({ t }: {
  t: (key: string) => string
}): JSX.Element => (
  <div className='mt-5'>
    <h3 className='text-center dark:text-gray-50'>
      {t('dashboard.noProjects')}
    </h3>
    <p className='text-center dark:text-gray-50'>
      {t('dashboard.createProject')}
    </p>
  </div>
)

interface DashboardProps {
  projects: IProject[]
  isLoading: boolean
  error: string
  user: IUser
  deleteProjectFailed: (error: string) => void
  setProjectsShareData: (data: Partial<ISharedProject>) => void
  setUserShareData: (data: Partial<ISharedProject>) => void
  userSharedUpdate: (message: string) => void
  sharedProjectError: (error: string) => void
  loadProjects: (take: number, skip: number) => void
  loadSharedProjects: (take: number, skip: number) => void
  total: number
  setDashboardPaginationPage: (page: number) => void
  dashboardPaginationPage: number
  sharedProjects: ISharedProject[]
  dashboardTabs: string
  setDashboardTabs: (tab: string) => void
  sharedTotal: number
  setDashboardPaginationPageShared: (page: number) => void
  dashboardPaginationPageShared: number
  captchaProjects: ICaptchaProject[]
  captchaTotal: number
  dashboardPaginationPageCaptcha: number
  setDashboardPaginationPageCaptcha: (page: number) => void
  loadProjectsCaptcha: (take: number, skip: number) => void
  projectTab: string
}

const Dashboard = ({
  projects, isLoading, error, user, deleteProjectFailed, setProjectsShareData,
  setUserShareData, userSharedUpdate, sharedProjectError, loadProjects, loadSharedProjects,
  total, setDashboardPaginationPage, dashboardPaginationPage, sharedProjects, dashboardTabs,
  setDashboardTabs, sharedTotal, setDashboardPaginationPageShared, dashboardPaginationPageShared, captchaProjects, captchaTotal, dashboardPaginationPageCaptcha, setDashboardPaginationPageCaptcha,
  loadProjectsCaptcha, projectTab,
}: DashboardProps): JSX.Element => {
  const { t, i18n: { language } }: {
    t: (key: string, options?: {
      [key: string]: string | number | null | undefined
    }) => string
    i18n: {
      language: string
    }
  } = useTranslation('common')
  const [showActivateEmailModal, setShowActivateEmailModal] = useState<boolean>(false)
  const history = useHistory()
  const [tabProjects, setTabProjects] = useState<string>(dashboardTabs)
  const pageAmountShared: number = Math.ceil(sharedTotal / ENTRIES_PER_PAGE_DASHBOARD)
  const pageAmount: number = Math.ceil(total / ENTRIES_PER_PAGE_DASHBOARD)
  const pageAmountCaptcha: number = Math.ceil(captchaTotal / ENTRIES_PER_PAGE_DASHBOARD)

  const onNewProject = () => {
    if (user.isActive || isSelfhosted) {
      if (dashboardTabs === tabForCaptchaProject) {
        history.push(routes.new_captcha)
      } else {
        history.push(routes.new_project)
      }
    } else {
      setShowActivateEmailModal(true)
    }
  }

  useEffect(() => {
    if (sharedTotal <= 0 && tabProjects === tabForSharedProject) {
      setDashboardTabs(tabForOwnedProject)
      setTabProjects(tabForOwnedProject)
    }

    setDashboardTabs(tabProjects)
  }, [tabProjects, setDashboardTabs, sharedTotal])

  useEffect(() => {
    if (tabProjects === tabForOwnedProject) {
      loadProjects(ENTRIES_PER_PAGE_DASHBOARD, (dashboardPaginationPage - 1) * ENTRIES_PER_PAGE_DASHBOARD)
    }
    if (tabProjects === tabForSharedProject) {
      loadSharedProjects(ENTRIES_PER_PAGE_DASHBOARD, (dashboardPaginationPageShared - 1) * ENTRIES_PER_PAGE_DASHBOARD)
    }
    if (tabProjects === tabForCaptchaProject) {
      loadProjectsCaptcha(ENTRIES_PER_PAGE_DASHBOARD, (dashboardPaginationPageCaptcha - 1) * ENTRIES_PER_PAGE_DASHBOARD)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardPaginationPage, dashboardPaginationPageShared])

  const [activeDashTab, setActiveDashTab] = useState<string | null>(() => {
    // @ts-ignore
    const url = new URL(window.location)
    const { searchParams } = url
    const tab = searchParams.get('tab')

    if (_includes(DASHBOARD_TABS_VALUES, tab)) {
      return tab
    }

    return projectTab || DASHBOARD_TABS.owned
  })

  const dashboardLocTabs = useMemo(() => {
    return [
      {
        id: DASHBOARD_TABS.owned,
        name: tabForOwnedProject,
        label: t('profileSettings.owned'),
      },
      {
        id: DASHBOARD_TABS.shared,
        name: tabForSharedProject,
        label: t('profileSettings.shared'),
      },
      {
        id: DASHBOARD_TABS.captcha,
        name: tabForCaptchaProject,
        label: t('profileSettings.captcha'),
      },
    ]
  }, [t])

  const activeDashTabLabel = useMemo(() => _find(dashboardLocTabs, tab => tab.id === activeDashTab)?.label, [dashboardLocTabs, activeDashTab])

  if (error && !isLoading) {
    return (
      <Title title={t('titles.dashboard')}>
        <div className='flex justify-center pt-10'>
          <div className='rounded-md bg-red-50 p-4 w-11/12 lg:w-4/6'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <XCircleIcon className='h-5 w-5 text-red-400' aria-hidden='true' />
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800'>{error}</h3>
              </div>
            </div>
          </div>
        </div>
      </Title>
    )
  }

  return (
    <Title title={t('titles.dashboard')}>
      <div className='min-h-min-footer bg-gray-50 dark:bg-gray-800'>
        <EventsRunningOutBanner />
        <div className='flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
          <div className='max-w-7xl w-full mx-auto'>
            <div className='flex justify-between'>
              <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>
                {t('titles.dashboard')}
              </h2>
              <span onClick={onNewProject} className='!pl-2 inline-flex justify-center items-center cursor-pointer text-center border border-transparent leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-sm'>
                <FolderPlusIcon className='w-5 h-5 mr-1' />
                {tabProjects === tabForCaptchaProject ? t('dashboard.newCaptchaProject') : t('dashboard.newProject')}
              </span>
            </div>
            <div className='mt-6'>
              {/* Dashboard tabs selector */}
              <div>
                <div className='sm:hidden mb-2'>
                  <Select
                    items={dashboardLocTabs}
                    keyExtractor={(item) => item.id}
                    labelExtractor={(item) => t(item.label)}
                    onSelect={(label) => {
                      const selected = _find(dashboardLocTabs, (tab) => t(tab.label) === label)
                      setTabProjects(selected?.name ? selected.name : tabForOwnedProject)
                      setActiveDashTab(selected?.id ? selected.id : DASHBOARD_TABS.owned)
                    }}
                    title={activeDashTabLabel}
                  />
                </div>
                <div className='hidden sm:block'>
                  {sharedTotal > 0 && (
                  <nav className='-mb-px flex space-x-8'>
                    {_map(tabsForDashboard, (tab) => (
                      <button
                        key={tab.name}
                        type='button'
                        onClick={() => setTabProjects(tab.name)}
                        className={cx('whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-md', {
                          'border-indigo-500 text-indigo-600 dark:text-indigo-500': tabProjects === tab.name,
                          'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-300': tabProjects !== tab.name,
                        })}
                        aria-current={tab.name === tabProjects ? 'page' : undefined}
                      >
                        {t(tab.label)}
                      </button>
                    ))}
                  </nav>
                  )}
                </div>
              </div>
            </div>
            {isLoading ? (
              <Title title={t('titles.dashboard')}>
                <div className='min-h-min-footer bg-gray-50 dark:bg-gray-800'>
                  <Loader />
                </div>
              </Title>
            ) : (
              <>

                {tabProjects === tabForOwnedProject && (
                <div>
                  {_isEmpty(_filter(projects, ({ uiHidden }) => !uiHidden)) ? (
                    <NoProjects t={t} />
                  ) : (
                    <div className='shadow overflow-hidden sm:rounded-md'>
                      <ul className='divide-y divide-gray-200 dark:divide-gray-500'>
                        {_map(_filter(projects, ({ uiHidden }) => !uiHidden), ({
                          name, id, created, active, overall, live, public: isPublic,
                        }) => (
                          <div key={id}>
                            <Link to={_replace(routes.project, ':id', id)}>
                              <ProjectCart
                                t={t}
                                language={language}
                                name={name}
                                created={created}
                                active={active}
                                isPublic={isPublic}
                                confirmed={false}
                                overall={overall}
                                live={_isNumber(live) ? live : 'N/A'}
                                setUserShareData={() => {}}
                                deleteProjectFailed={() => {}}
                                userSharedUpdate={() => {}}
                                sharedProjects={[]}
                                setProjectsShareData={() => {}}
                                sharedProjectError={() => {}}
                              />
                            </Link>
                          </div>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                )}
                {tabProjects === tabForCaptchaProject && (
                <div>
                  {_isEmpty(_filter(captchaProjects, ({ uiHidden }) => !uiHidden)) ? (
                    <NoProjects t={t} />
                  ) : (
                    <div className='shadow overflow-hidden sm:rounded-md'>
                      <ul className='divide-y divide-gray-200 dark:divide-gray-500'>
                        {_map(_filter(captchaProjects, ({ uiHidden }) => !uiHidden), ({
                          name, id, created, active, overall, live, public: isPublic,
                        }) => (
                          <div key={id}>
                            <Link to={_replace(routes.captcha, ':id', id)}>
                              <ProjectCart
                                t={t}
                                language={language}
                                name={name}
                                created={created}
                                captcha
                                active={active}
                                isPublic={isPublic}
                                overall={overall}
                                live={_isNumber(live) ? live : 'N/A'}
                                deleteProjectFailed={() => {}}
                                sharedProjects={[]}
                                setProjectsShareData={() => {}}
                                setUserShareData={() => {}}
                                userSharedUpdate={() => {}}
                                sharedProjectError={() => {}}
                              />
                            </Link>
                          </div>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                )}

                {tabProjects === tabForSharedProject && (
                <div>
                  {_isEmpty(_filter(sharedProjects, ({ uiHidden }) => !uiHidden)) ? (
                    <NoProjects t={t} />
                  ) : (
                    <div className='shadow overflow-hidden sm:rounded-md'>
                      <ul className='divide-y divide-gray-200 dark:divide-gray-500'>
                        {_map(_filter(sharedProjects, ({ uiHidden }) => !uiHidden), ({
                          project, confirmed,
                        }) => (
                          <div key={confirmed ? `${project?.id}-confirmed` : project?.id}>
                            {
                                (_isUndefined(confirmed) || confirmed) ? (
                                  <Link to={_replace(routes.project, ':id', project?.id ? project?.id : '')}>
                                    <ProjectCart
                                      t={t}
                                      language={language}
                                      name={project?.name}
                                      created={project?.created}
                                      shared
                                      active={project?.active}
                                      isPublic={project?.public}
                                      confirmed={confirmed}
                                      overall={project?.overall}
                                      live={_isNumber(project?.live) ? project?.live : 'N/A'}
                                      setUserShareData={() => {}}
                                      deleteProjectFailed={() => {}}
                                      sharedProjects={[]}
                                      setProjectsShareData={() => {}}
                                      userSharedUpdate={() => {}}
                                      sharedProjectError={() => {}}
                                    />
                                  </Link>
                                ) : (
                                  <ProjectCart
                                    t={t}
                                    id={project?.id}
                                    language={language}
                                    name={project?.name}
                                    created={project?.created}
                                    shared
                                    active={project?.active}
                                    isPublic={project?.public}
                                    overall={project?.overall}
                                    confirmed={confirmed}
                                    sharedProjects={user.sharedProjects}
                                    setProjectsShareData={setProjectsShareData}
                                    setUserShareData={setUserShareData}
                                    live={_isNumber(project?.live) ? project?.live : 'N/A'}
                                    userSharedUpdate={userSharedUpdate}
                                    sharedProjectError={sharedProjectError}
                                    deleteProjectFailed={deleteProjectFailed}
                                  />
                                )
                              }
                          </div>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                )}
              </>
            )}
            {(tabProjects === tabForOwnedProject && pageAmount > 1) && (
              <Pagination page={dashboardPaginationPage} pageAmount={pageAmount} setPage={setDashboardPaginationPage} total={total} />
            )}
            {(tabProjects === tabForSharedProject && pageAmountShared > 1) && (
              <Pagination page={dashboardPaginationPageShared} pageAmount={pageAmountShared} setPage={setDashboardPaginationPageShared} total={sharedTotal} />
            )}
            {(tabProjects === tabForCaptchaProject && pageAmountCaptcha > 1) && (
              <Pagination page={dashboardPaginationPageCaptcha} pageAmount={pageAmountCaptcha} setPage={setDashboardPaginationPageCaptcha} total={captchaTotal} />
            )}
          </div>
        </div>
      </div>
      <Modal
        onClose={() => setShowActivateEmailModal(false)}
        onSubmit={() => setShowActivateEmailModal(false)}
        submitText={t('common.gotIt')}
        title={t('dashboard.verifyEmailTitle')}
        type='info'
        message={t('dashboard.verifyEmailDesc')}
        isOpened={showActivateEmailModal}
      />
    </Title>
  )
}

Dashboard.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  sharedProjects: PropTypes.arrayOf(PropTypes.object).isRequired,
  user: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  deleteProjectFailed: PropTypes.func.isRequired,
  setProjectsShareData: PropTypes.func.isRequired,
  setUserShareData: PropTypes.func.isRequired,
  sharedProjectError: PropTypes.func.isRequired,
  userSharedUpdate: PropTypes.func.isRequired,
  loadProjects: PropTypes.func.isRequired,
  total: PropTypes.number.isRequired,
  setDashboardPaginationPage: PropTypes.func.isRequired,
  setDashboardPaginationPageShared: PropTypes.func.isRequired,
  dashboardPaginationPage: PropTypes.number.isRequired,
  dashboardPaginationPageShared: PropTypes.number.isRequired,
  dashboardTabs: PropTypes.string.isRequired,
  setDashboardTabs: PropTypes.func.isRequired,
  sharedTotal: PropTypes.number.isRequired,
}

Dashboard.defaultProps = {
  error: '',
}

export default memo(withAuthentication(Dashboard, auth.authenticated))
