import React, { useState, useEffect, memo } from 'react'
import { useNavigate } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _keys from 'lodash/keys'

import { withAuthentication, auth } from 'hoc/protected'
import { isSelfhosted, TITLE_SUFFIX, ENTRIES_PER_PAGE_DASHBOARD } from 'redux/constants'
import { IProject } from 'redux/models/IProject'
import { createProject } from 'api'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Loader from 'ui/Loader'
import { trackCustom } from 'utils/analytics'
import routes from 'routesPath'
import { useAppDispatch, StateType } from 'redux/store'
import sagaActions from 'redux/sagas/actions'
import { alertsActions } from 'redux/reducers/alerts'
import { errorsActions } from 'redux/reducers/errors'

const MAX_NAME_LENGTH = 50

const DEFAULT_PROJECT_NAME = 'Untitled Project'

const NewProject = () => {
  const { dashboardPaginationPage } = useSelector((state: StateType) => state.ui.projects)
  const dispatch = useAppDispatch()
  const _dispatch = useDispatch()
  const { user, loading } = useSelector((state: StateType) => state.auth)
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  const [form, setForm] = useState<Partial<IProject>>({
    name: '',
  })
  const [validated, setValidated] = useState<boolean>(false)
  const [errors, setErrors] = useState<{
    name?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState<boolean>(false)
  const [projectSaving, setProjectSaving] = useState<boolean>(false)

  useEffect(() => {
    if (loading) {
      return
    }

    if (!user.isActive && !isSelfhosted) {
      dispatch(
        errorsActions.genericError({
          message: t('project.settings.verify'),
        }),
      )
      navigate(routes.dashboard)
    }
  }, [user, navigate, dispatch, t, loading])

  const onSubmit = async (data: Partial<IProject>) => {
    if (!projectSaving) {
      setProjectSaving(true)
      try {
        await createProject({
          name: data.name || DEFAULT_PROJECT_NAME,
        })
        trackCustom('PROJECT_CREATED')
        navigate(routes.dashboard)
        dispatch(
          alertsActions.generateAlerts({
            message: t('project.settings.created'),
            type: 'success',
          }),
        )

        _dispatch(sagaActions.loadProjects(dashboardPaginationPage * ENTRIES_PER_PAGE_DASHBOARD))
      } catch (reason) {
        dispatch(
          errorsActions.createNewProjectFailed({
            message: reason as string,
          }),
        )
      } finally {
        setProjectSaving(false)
      }
    }
  }

  const validate = () => {
    const allErrors: {
      name?: string
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

  const onCancel = () => {
    navigate(routes.dashboard)
  }

  useEffect(() => {
    document.title = `${t('project.settings.create')} ${TITLE_SUFFIX}`
  }, [t])

  if (loading) {
    return (
      <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8'>
      <form className='mx-auto w-full max-w-7xl' onSubmit={handleSubmit}>
        <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{t('project.settings.create')}</h2>
        <Input
          name='name'
          label={t('project.settings.name')}
          value={form.name}
          placeholder='My awesome project'
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.name : null}
        />
        <p className='mb-4 mt-1 text-sm italic text-gray-500 dark:text-gray-300'>{t('project.settings.createHint')}</p>

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
      </form>
    </div>
  )
}

export default memo(withAuthentication(NewProject, auth.authenticated))
