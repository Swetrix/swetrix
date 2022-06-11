/* eslint-disable react/forbid-prop-types */
import React, { memo, useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import cx from 'clsx'
import dayjs from 'dayjs'
import PropTypes from 'prop-types'
import _isEmpty from 'lodash/isEmpty'
import _isNumber from 'lodash/isNumber'
import _replace from 'lodash/replace'
import _map from 'lodash/map'
import _filter from 'lodash/filter'
import _find from 'lodash/find'
import { useTranslation } from 'react-i18next'
import { EyeIcon, CalendarIcon } from '@heroicons/react/outline'
import { ArrowSmUpIcon, ArrowSmDownIcon, XCircleIcon } from '@heroicons/react/solid'

import Modal from 'ui/Modal'
import { withAuthentication, auth } from 'hoc/protected'
import Title from 'components/Title'
import Loader from 'ui/Loader'
import { ActivePin, InactivePin } from 'ui/Pin'
import PulsatingCircle from 'ui/icons/PulsatingCircle'
import routes from 'routes'
import { isSelfhosted } from 'redux/constants'
import EventsRunningOutBanner from 'components/EventsRunningOutBanner'

import { deleteShareProject, acceptShareProject } from 'api'

const ProjectCart = ({
  name, created, active, overall, t, language, live, isPublic, confirmed, id, deleteProjectFailed, sharedProjects, removeProject, removeShareProject,
}) => {
  const statsDidGrowUp = overall?.percChange >= 0
  const [showInviteModal, setShowInviteModal] = useState(false)

  const deleteProject = async () => {
    const pid = _find(sharedProjects, item => item.project.id === id).id

    await deleteShareProject(pid)
      .then((results) => {
        removeProject(id)
        removeShareProject(pid)
      })
      .catch((err) => {
        deleteProjectFailed(err)
      })
  }

  const onAccept = async () => {
    const pid = _find(sharedProjects, item => item.project.id === id).id
    console.log(sharedProjects)
    await acceptShareProject(pid)
      .then((results) => {
        console.log(results)
      })
      .catch((err) => {
        deleteProjectFailed(err)
      })
  }

  return (
    <li>
      <div onClick={() => { return confirmed === false ? setShowInviteModal(true) : () => {} }} className='block cursor-pointer hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-800 dark:border-gray-700'>
        <div className='px-4 py-4 sm:px-6'>
          <div className='flex items-center justify-between'>
            <p className='text-lg font-medium text-indigo-600 dark:text-gray-50 truncate'>
              {name}
            </p>
            <div className='ml-2 flex-shrink-0 flex'>
              {
                confirmed ? (
                  <ActivePin className='mr-2' label='Shared' />
                ) : (
                  <InactivePin className='mr-2' label='Panding' />
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
                          <ArrowSmUpIcon className='self-center flex-shrink-0 h-4 w-4 text-green-500' />
                          <span className='sr-only'>
                            {t('dashboard.inc')}
                          </span>
                        </>
                      ) : (
                        <>
                          <ArrowSmDownIcon className='self-center flex-shrink-0 h-4 w-4 text-red-500' />
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
              <div className='mt-2 flex items-center text-sm text-gray-500 dark:text-gray-300 sm:mt-0'>
                <PulsatingCircle className='flex-shrink-0 mr-3 ml-1' />
                {t('dashboard.liveVisitors')}
                :&nbsp;
                {live}
              </div>
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
            onClose={() => { setShowInviteModal(false); deleteProject() }}
            onSubmit={() => { setShowInviteModal(false); onAccept() }}
            submitText='Accept & Continue'
            type='confirmed'
            closeText='Reject'
            title={`Invitanion for ${name}`}
            message='You have been invited to join this project. Do you want to accept?'
            isOpened={showInviteModal}
          />
        )
      }
    </li>
  )
}

const NoProjects = ({ t }) => (
  <div className='mt-5'>
    <h3 className='text-center dark:text-gray-50'>
      {t('dashboard.noProjects')}
    </h3>
    <p className='text-center dark:text-gray-50'>
      {t('dashboard.createProject')}
    </p>
  </div>
)

const Dashboard = ({
  projects, isLoading, error, user, deleteProjectFailed, removeProject, removeShareProject,
}) => {
  const { t, i18n: { language } } = useTranslation('common')
  const [showActivateEmailModal, setShowActivateEmailModal] = useState(false)
  const history = useHistory()

  const onNewProject = () => {
    if (user.isActive || isSelfhosted) {
      history.push(routes.new_project)
    } else {
      setShowActivateEmailModal(true)
    }
  }

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

  if (!isLoading) {
    return (
      <Title title={t('titles.dashboard')}>
        <div className='min-h-min-footer bg-gray-50 dark:bg-gray-800'>
          <EventsRunningOutBanner />
          <div className='flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
            <div className='max-w-7xl w-full mx-auto'>
              <div className='flex justify-between'>
                <h2 className='mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-50'>
                  {t('titles.dashboard')}
                </h2>
                <span onClick={onNewProject} className='inline-flex cursor-pointer items-center border border-transparent leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm'>
                  {t('dashboard.newProject')}
                </span>
              </div>
              {_isEmpty(projects) ? (
                <NoProjects t={t} />
              ) : (
                <div className='bg-white shadow overflow-hidden sm:rounded-md mt-10'>
                  <ul className='divide-y divide-gray-200 dark:divide-gray-500'>
                    {_map(_filter(projects, ({ uiHidden }) => !uiHidden), ({
                      name, id, created, active, overall, live, public: isPublic, confirmed,
                    }) => (
                      <div key={confirmed ? `${id}-confirmed` : id}>
                        {
                        confirmed === false ? (
                          <ProjectCart
                            t={t}
                            id={id}
                            language={language}
                            name={name}
                            created={created}
                            active={active}
                            isPublic={isPublic}
                            removeProject={removeProject}
                            overall={overall}
                            confirmed={confirmed}
                            sharedProjects={user.sharedProjects}
                            removeShareProject={removeShareProject}
                            live={_isNumber(live) ? live : 'N/A'}
                            deleteProjectFailed={deleteProjectFailed}
                          />
                        ) : (
                          <Link to={_replace(routes.project, ':id', id)}>
                            <ProjectCart
                              t={t}
                              language={language}
                              name={name}
                              created={created}
                              active={active}
                              isPublic={isPublic}
                              overall={overall}
                              live={_isNumber(live) ? live : 'N/A'}
                            />
                          </Link>
                        )
                      }
                      </div>
                    ))}
                  </ul>
                </div>
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

  return (
    <Title title={t('titles.dashboard')}>
      <div className='min-h-min-footer'>
        <Loader />
      </div>
    </Title>
  )
}

Dashboard.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object).isRequired,
  user: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  deleteProjectFailed: PropTypes.func,
  removeProject: PropTypes.func,
  removeShareProject: PropTypes.func,
}

Dashboard.defaultProps = {
  error: '',
  removeProject: () => {},
  deleteProjectFailed: (e) => console.log(e),
  removeShareProject: () => {},
}

export default memo(withAuthentication(Dashboard, auth.authenticated))
