import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _size from 'lodash/size'
import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { createProject } from '~/api'
import { withAuthentication, auth } from '~/hoc/protected'
import { isSelfhosted, TITLE_SUFFIX } from '~/lib/constants'
import { Project } from '~/lib/models/Project'
import { useAuth } from '~/providers/AuthProvider'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import { trackCustom } from '~/utils/analytics'
import routes from '~/utils/routes'

export const MAX_PROJECT_NAME_LENGTH = 50

const DEFAULT_PROJECT_NAME = 'Untitled Project'

const NewProject = () => {
  const { user, isLoading } = useAuth()
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  const [form, setForm] = useState<Partial<Project>>({
    name: '',
    organisationId: undefined,
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [projectSaving, setProjectSaving] = useState(false)

  const organisations = useMemo(
    () => [
      {
        id: undefined,
        name: t('common.notSet'),
      },
      ...(user?.organisationMemberships || [])
        .filter((om) => om.confirmed && (om.role === 'admin' || om.role === 'owner'))
        .map((om) => om.organisation),
    ],
    [user?.organisationMemberships, t],
  )

  useEffect(() => {
    if (isLoading || !user) {
      return
    }

    if (!user.isActive && !isSelfhosted) {
      toast.error(t('project.settings.verify'))
      navigate(routes.dashboard)
    }
  }, [user, navigate, t, isLoading])

  const onSubmit = async (data: Partial<Project>) => {
    if (!projectSaving) {
      setProjectSaving(true)
      try {
        await createProject({
          name: data.name || DEFAULT_PROJECT_NAME,
          organisationId: data.organisationId,
        })
        trackCustom('PROJECT_CREATED', {
          from: 'new-project',
        })
        navigate(routes.dashboard)
        toast.success(t('project.settings.created'))
      } catch (reason: any) {
        toast.error(reason)
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

    if (_size(form.name) > MAX_PROJECT_NAME_LENGTH) {
      allErrors.name = t('project.settings.pxCharsError', { amount: MAX_PROJECT_NAME_LENGTH })
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

  useEffect(() => {
    document.title = `${t('project.settings.create')} ${TITLE_SUFFIX}`
  }, [t])

  if (isLoading) {
    return (
      <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-900'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='flex min-h-min-footer flex-col bg-gray-50 dark:bg-slate-900'>
      <form className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8' onSubmit={handleSubmit}>
        <Text as='h2' size='3xl' weight='bold' className='mt-2'>
          {t('project.settings.create')}
        </Text>
        <Input
          name='name'
          label={t('project.settings.name')}
          value={form.name}
          placeholder='My awesome website'
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.name : null}
        />

        {organisations.length > 1 ? (
          <div className='mt-4'>
            <Select
              items={organisations}
              keyExtractor={(item) => item.id || 'not-set'}
              labelExtractor={(item) => {
                if (item.id === undefined) {
                  return <span className='italic'>{t('common.notSet')}</span>
                }

                return item.name
              }}
              onSelect={(item) => {
                setForm((oldForm) => ({
                  ...oldForm,
                  organisationId: item.id,
                }))
              }}
              label={t('project.settings.organisation')}
              title={organisations.find((org) => org.id === form.organisationId)?.name}
              selectedItem={organisations.find((org) => org.id === form.organisationId)}
            />
          </div>
        ) : null}

        <Text as='p' size='sm' colour='muted' className='mt-1 mb-4 italic'>
          {t('project.settings.createHint')}
        </Text>

        <div>
          <Button
            className='mr-2 border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
            as={Link}
            // @ts-expect-error
            to={routes.dashboard}
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

export default withAuthentication(NewProject, auth.authenticated)
