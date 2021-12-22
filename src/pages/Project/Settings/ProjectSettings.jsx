import React, { useState, useEffect, useMemo, memo } from 'react'
import { useLocation, useHistory, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import _size from 'lodash/size'
import _replace from 'lodash/replace'
import _find from 'lodash/find'
import _join from 'lodash/join'
import _isString from 'lodash/isString'
import _split from 'lodash/split'
import PropTypes from 'prop-types'

import Title from 'components/Title'
import { isAuthenticated } from '../../../hoc/protected'
import { isSelfhosted } from 'redux/constants'
import { createProject, updateProject, deleteProject } from 'api'
import Input from 'ui/Input'
import Button from 'ui/Button'
import Checkbox from 'ui/Checkbox'
import Modal from 'ui/Modal'
import { nanoid } from 'utils/random'
import routes from 'routes'

const MAX_NAME_LENGTH = 50
const MAX_ORIGINS_LENGTH = 300

const ProjectSettings = ({
  updateProjectFailed, createNewProjectFailed, newProject, projectDeleted, deleteProjectFailed,
  loadProjects, isLoading, projects, showError, removeProject, user,
}) => {
  const { t } = useTranslation('common')
  const { pathname } = useLocation()
  const { id } = useParams()
  const project = useMemo(() => _find(projects, p => p.id === id) || {}, [projects, id])
  const isSettings = !_isEmpty(id) && (_replace(routes.project_settings, ':id', id) === pathname)
  const history = useHistory()
  const [form, setForm] = useState({
    name: '',
    id: id || nanoid(),
    origins: '', // origins string, ',' is used as a separator. converted to an array on the backend side.
    public: false,
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [projectDeleting, setProjectDeleting] = useState(false)
  const [projectSaving, setProjectSaving] = useState(false)

  useEffect(() => {
    if (!user.isActive && !isSelfhosted) {
      showError(t('project.settings.verify'))
      history.push(routes.dashboard)
    }

    if (!isLoading && isSettings && !projectDeleting) {
      if (_isEmpty(project) || project?.uiHidden) {
        showError(t('project.noExist'))
        history.push(routes.dashboard)
      } else {
        setForm({
          ...project,
          origins: _isString(project.origins) ? project.origins : _join(project.origins, ', '),
        })
      }
    }
  }, [user, project, isLoading, isSettings, history, showError, projectDeleting, t])

  const onSubmit = async (data) => {
    if (!projectSaving) {
      setProjectSaving(true)
      try {
        const formalisedData = {
          ...data,
          origins: _split(data.origins, ','),
        }

        if (isSettings) {
          await updateProject(id, formalisedData)
          newProject(t('project.settings.updated'))
        } else {
          await createProject(formalisedData)
          newProject(t('project.settings.created'))
        }

        loadProjects()
        history.push(routes.dashboard)
      } catch (e) {
        if (isSettings) {
          updateProjectFailed(e)
        } else {
          createNewProjectFailed(e)
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
        removeProject(id)
        projectDeleted()
        history.push(routes.dashboard)
      } catch (e) {
        deleteProjectFailed(e)
      } finally {
        setProjectDeleting(false)
      }
    }
  }

  useEffect(() => {
    validate()
  }, [form]) // eslint-disable-line

  const handleInput = event => {
    const t = event.target
    const value = t.type === 'checkbox' ? t.checked : t.value

    setForm(form => ({
      ...form,
      [t.name]: value,
    }))
  }

  const handleSubmit = e => {
    e.preventDefault()
    e.stopPropagation()
    setBeenSubmitted(true)

    if (validated) {
      onSubmit(form)
    }
  }

  const validate = () => {
    const allErrors = {}

    if (_isEmpty(form.name)) {
      allErrors.name = t('project.settings.noNameError')
    }

    if (_size(form.name) > MAX_NAME_LENGTH) {
      allErrors.name = t('project.settings.pxCharsError', { amount: MAX_NAME_LENGTH })
    }

    if (_size(form.origins) > MAX_ORIGINS_LENGTH) {
      allErrors.origins = t('project.settings.oxCharsError', { amount: MAX_ORIGINS_LENGTH })
    }

    const valid = Object.keys(allErrors).length === 0

    setErrors(allErrors)
    setValidated(valid)
  }

  const onCancel = () => {
    history.push(isSettings ? _replace(routes.project, ':id', id) : routes.dashboard)
  }

  const title = isSettings ? `${t('project.settings.settings')} ${form.name}` : t('project.settings.create')

  return (
    <Title title={title}>
      <div className='min-h-min-footer bg-gray-50 flex flex-col py-6 px-4 sm:px-6 lg:px-8'>
        <form className='max-w-7xl w-full mx-auto' onSubmit={handleSubmit}>
          <h2 className='mt-2 text-3xl font-extrabold text-gray-900'>
            {title}
          </h2>
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
          <Input
            name='id'
            id='id'
            type='text'
            label={t('project.settings.pid')}
            value={form.id}
            className='mt-4'
            onChange={handleInput}
            error={beenSubmitted ? errors.id : null}
            disabled
          />
          {isSettings ? (
            <>
              <Input
                name='origins'
                id='origins'
                type='text'
                label={t('project.settings.origins')}
                hint={t('project.settings.originsHint')}
                value={form.origins}
                className='mt-4'
                onChange={handleInput}
                error={beenSubmitted ? errors.origins : null}
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
                onChange={handleInput}
                name='public'
                id='public'
                className='mt-4'
                label={t('project.settings.public')}
                hint={t('project.settings.publicHint')}
              />
            </>
          ) : (
            <p className='text-gray-500 italic mt-2 text-sm'>
              {t('project.settings.createHint')}
            </p>
          )}
          <div className='flex justify-between mt-4'>
            <div>
              <Button className='mr-2' onClick={onCancel} secondary regular>
                {t('common.cancel')}
              </Button>
              <Button type='submit' loading={projectSaving} primary regular>
                {t('common.save')}
              </Button>
            </div>
            {isSettings && (
              <Button onClick={() => !projectDeleting && setShowDelete(true)} loading={projectDeleting} danger large>
                {t('project.settings.delete')}
              </Button>
            )}
          </div>
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
      </div>
    </Title>
  )
}

ProjectSettings.propTypes = {
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
}

export default isAuthenticated(memo(ProjectSettings))
