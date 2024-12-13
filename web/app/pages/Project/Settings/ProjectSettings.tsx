import React, { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useLoaderData, useNavigate, Link } from '@remix-run/react'
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
import _toUpper from 'lodash/toUpper'
import _includes from 'lodash/includes'
import { TrashIcon, XCircleIcon } from '@heroicons/react/24/outline'

import { withAuthentication, auth } from '~/hoc/protected'
import { isSelfhosted, TITLE_SUFFIX, FILTERS_PANELS_ORDER, isBrowser } from '~/lib/constants'
import { Project } from '~/lib/models/Project'
import {
  updateProject,
  deleteProject,
  resetProject,
  transferProject,
  deletePartially,
  getFilters,
  resetFilters,
  getProject,
  assignProjectToOrganisation,
} from '~/api'
import Input from '~/ui/Input'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Checkbox from '~/ui/Checkbox'
import Modal from '~/ui/Modal'
import FlatPicker from '~/ui/Flatpicker'
import countries from '~/utils/isoCountries'
import routes from '~/utils/routes'
import Dropdown from '~/ui/Dropdown'
import MultiSelect from '~/ui/MultiSelect'
import CCRow from '../View/components/CCRow'
import { getFormatDate } from '../View/ViewProject.helpers'

import People from './People'
import Emails from './Emails'
import Select from '~/ui/Select'
import { useRequiredParams } from '~/hooks/useRequiredParams'
import { ArrowLeftRight, RotateCcw } from 'lucide-react'
import { StateType } from '~/lib/store'
import { useSelector } from 'react-redux'

const MAX_NAME_LENGTH = 50
const MAX_ORIGINS_LENGTH = 300
const MAX_IPBLACKLIST_LENGTH = 300

const DELETE_DATA_MODAL_TABS = [
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

interface ModalMessageProps {
  dateRange: Date[]
  setDateRange: (a: Date[]) => void
  setTab: (i: string) => void
  tab: string
  pid: string
  activeFilter: string[]
  setActiveFilter: any
  filterType: string
  setFilterType: (a: string) => void
}

const ModalMessage = ({
  dateRange,
  setDateRange,
  setTab,
  tab,
  pid,
  activeFilter,
  setActiveFilter,
  filterType,
  setFilterType,
}: ModalMessageProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [filterList, setFilterList] = useState<string[]>([])
  const [searchList, setSearchList] = useState<string[]>([])

  const getFiltersList = async () => {
    if (!_isEmpty(filterType)) {
      const res = await getFilters(pid, filterType)
      setFilterList(res)
      setSearchList(res)
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
      <p className='mb-4 mt-1 text-sm italic text-gray-500 dark:text-gray-300'>{t('project.settings.resetHint')}</p>
      <div className='mt-6'>
        <nav className='-mb-px flex space-x-6'>
          {_map(DELETE_DATA_MODAL_TABS, (tabDelete) => (
            <button
              key={tabDelete.name}
              type='button'
              onClick={() => setTab(tabDelete.name)}
              className={cx('text-md whitespace-nowrap border-b-2 px-1 pb-2 font-medium', {
                'border-indigo-500 text-indigo-600 dark:border-gray-50 dark:text-gray-50': tabDelete.name === tab,
                'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-300 dark:hover:text-gray-300':
                  tab !== tabDelete.name,
              })}
            >
              {t(tabDelete.title)}
            </button>
          ))}
        </nav>
      </div>
      {tab === DELETE_DATA_MODAL_TABS[1].name && (
        <>
          <p className='mb-2 mt-4 text-sm text-gray-500 dark:text-gray-300'>
            {t('project.settings.reseted.partiallyDesc')}
          </p>
          <p className='mb-2 mt-1 text-sm italic text-gray-500 dark:text-gray-300'>
            {t('project.settings.reseted.partiallyHint')}
          </p>
          <input
            type='text'
            className='m-0 h-0 w-0 border-0 p-0 focus:border-transparent focus:text-transparent focus:shadow-none focus:ring-transparent'
          />
          <FlatPicker
            onChange={(date) => setDateRange(date)}
            options={{
              altInputClass:
                'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:text-gray-50 dark:placeholder-gray-400 dark:border-gray-800 dark:bg-slate-800 rounded-md',
            }}
            value={dateRange}
          />
        </>
      )}
      {tab === DELETE_DATA_MODAL_TABS[0].name && (
        <p className='mb-4 mt-4 text-sm italic text-gray-500 dark:text-gray-300'>
          {t('project.settings.reseted.allHint')}
        </p>
      )}
      {tab === DELETE_DATA_MODAL_TABS[2].name && (
        <div className='min-h-[410px]'>
          <p className='mb-4 mt-4 text-sm italic text-gray-500 dark:text-gray-300'>
            {t('project.settings.reseted.viaFiltersHint')}
          </p>
          <div>
            <Dropdown
              className='min-w-[160px]'
              title={
                !_isEmpty(filterType) ? t(`project.mapping.${filterType}`) : t('project.settings.reseted.selectFilters')
              }
              items={FILTERS_PANELS_ORDER}
              labelExtractor={(item) => t(`project.mapping.${item}`)}
              keyExtractor={(item) => item}
              onSelect={(item) => setFilterType(item)}
            />
            <div className='h-2' />
            {filterType && !_isEmpty(filterList) ? (
              <MultiSelect
                className='max-w-max'
                items={searchList}
                // eslint-disable-next-line react/no-unstable-nested-components
                labelExtractor={(item) => {
                  if (filterType === 'cc') {
                    return <CCRow cc={item} language={language} />
                  }

                  return item
                }}
                // eslint-disable-next-line react/no-unstable-nested-components
                itemExtractor={(item) => {
                  if (filterType === 'cc') {
                    return <CCRow cc={item} language={language} />
                  }

                  return item
                }}
                keyExtractor={(item) => item}
                label={activeFilter}
                searchPlaseholder={t('project.search')}
                onSearch={(search: string) => {
                  if (search.length > 0) {
                    if (filterType === 'cc') {
                      setSearchList(
                        _filter(filterList, (item) =>
                          _includes(_toUpper(countries.getName(item, language)), _toUpper(search)),
                        ),
                      )
                      return
                    }

                    setSearchList(_filter(filterList, (item) => _includes(_toUpper(item), _toUpper(search))))
                  } else {
                    setSearchList(filterList)
                  }
                }}
                placholder={t('project.settings.reseted.filtersPlaceholder')}
                onSelect={(item: string) =>
                  setActiveFilter((oldItems: string[]) => {
                    if (_includes(oldItems, item)) {
                      return _filter(oldItems, (i) => i !== item)
                    }
                    return [...oldItems, item]
                  })
                }
                onRemove={(item: string) =>
                  setActiveFilter((oldItems: string[]) => _filter(oldItems, (i) => i !== item))
                }
              />
            ) : (
              <p className='mb-4 mt-4 text-sm italic text-gray-500 dark:text-gray-300'>
                {t('project.settings.reseted.noFilters')}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

interface Form extends Partial<Project> {
  origins: string | null
  ipBlacklist: string | null
}

const DEFAULT_PROJECT_NAME = 'Untitled Project'

const ProjectSettings = () => {
  const { user, loading: authLoading } = useSelector((state: StateType) => state.auth)

  const { t } = useTranslation('common')
  const { id } = useRequiredParams<{ id: string }>()
  const navigate = useNavigate()
  const { requestOrigin } = useLoaderData<{ requestOrigin: string | null }>()

  const [project, setProject] = useState<Project | null>(null)
  const [form, setForm] = useState<Form>({
    name: '',
    id,
    public: false,
    isPasswordProtected: false,
    origins: null,
    ipBlacklist: null,
    botsProtectionLevel: 'basic',
  })
  const [validated, setValidated] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    origins?: string
    ipBlacklist?: string
    password?: string
  }>({})
  const [beenSubmitted, setBeenSubmitted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [setResetting, setIsResetting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferEmail, setTransferEmail] = useState('')
  const [dateRange, setDateRange] = useState<Date[]>([])
  const [tab, setTab] = useState(DELETE_DATA_MODAL_TABS[0].name)
  const [showProtected, setShowProtected] = useState(false)

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  // for reset data via filters
  const [activeFilter, setActiveFilter] = useState<string[]>([])
  const [filterType, setFilterType] = useState('')

  const botsProtectionLevels = useMemo(() => {
    return [
      {
        name: 'off',
        title: t('project.settings.botsProtectionLevel.levels.off'),
      },
      {
        name: 'basic',
        title: t('project.settings.botsProtectionLevel.levels.basic'),
      },
    ] as const
  }, [t])

  const organisations = useMemo(
    () => [
      {
        id: undefined,
        name: t('common.notSet'),
      },
      ...(user.organisationMemberships || [])
        .filter((om) => om.confirmed && (om.role === 'admin' || om.role === 'owner'))
        .map((om) => om.organisation),
    ],
    [user.organisationMemberships, t],
  )

  const assignOrganisation = async (organisationId?: string) => {
    try {
      await assignProjectToOrganisation(id, organisationId)
      toast.success(t('apiNotifications.projectAssigned'))
    } catch (reason: any) {
      toast.error(typeof reason === 'string' ? reason : t('apiNotifications.projectAssignError'))
    }
  }

  const sharableLink = useMemo(() => {
    const origin = requestOrigin || isBrowser ? window.location.origin : 'https://swetrix.com'

    return `${origin}/projects/${id}`
  }, [requestOrigin, id])

  const loadProject = async (projectId: string) => {
    if (isLoading) {
      return
    }
    setIsLoading(true)

    try {
      const result = await getProject(projectId)
      setProject(result)
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
    if (!isSaving) {
      setIsSaving(true)
      try {
        const formalisedData = {
          ...data,
          origins: _isEmpty(data.origins)
            ? null
            : _map(_split(data.origins, ','), (origin) => {
                try {
                  if (_includes(origin, 'localhost')) {
                    return origin
                  }
                  return new URL(origin).host
                } catch {
                  return origin
                }
              }),
          ipBlacklist: _isEmpty(data.ipBlacklist) ? null : _split(data.ipBlacklist, ','),
        }
        await updateProject(id, formalisedData as Partial<Project>)
        toast.success(t('project.settings.updated'))
      } catch (reason: any) {
        toast.error(reason)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const onDelete = async () => {
    setShowDelete(false)

    if (isDeleting) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteProject(id)
      toast.success(t('project.settings.deleted'))
      navigate(routes.dashboard)
    } catch (reason: any) {
      toast.error(reason)
    } finally {
      setIsDeleting(false)
    }
  }

  const onReset = async () => {
    setShowReset(false)

    if (setResetting) {
      return
    }

    setIsResetting(true)

    try {
      if (tab === DELETE_DATA_MODAL_TABS[1].name) {
        if (_isEmpty(dateRange)) {
          toast.error(t('project.settings.noDateRange'))
          setIsResetting(false)
          return
        }
        await deletePartially(id, {
          from: getFormatDate(dateRange[0]),
          to: getFormatDate(dateRange[1]),
        })
      } else if (tab === DELETE_DATA_MODAL_TABS[2].name) {
        if (_isEmpty(activeFilter)) {
          toast.error(t('project.settings.noFilters'))
          setIsResetting(false)
          return
        }

        await resetFilters(id, filterType, activeFilter)
      } else {
        await resetProject(id)
      }
      toast.success(t('project.settings.resetted'))
      navigate(routes.dashboard)
    } catch (reason: any) {
      toast.error(reason)
    } finally {
      setIsResetting(false)
    }
  }

  const validate = () => {
    const allErrors: {
      name?: string
      origins?: string
      ipBlacklist?: string
      password?: string
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

  const onTransfer = async () => {
    await transferProject(id, transferEmail)
      .then(() => {
        toast.success(t('apiNotifications.transferRequestSent'))
        navigate(routes.dashboard)
      })
      .catch((reason) => {
        toast.error(reason)
      })
      .finally(() => {
        setShowTransfer(false)
        setTransferEmail('')
      })
  }

  const onProtected = async () => {
    setBeenSubmitted(true)

    if (validated) {
      await onSubmit({
        ...form,
        isPasswordProtected: true,
      })

      setForm((prev) => ({
        ...prev,
        isPasswordProtected: true,
      }))

      setShowProtected(false)
    }
  }

  const title = `${t('project.settings.settings')} ${form.name}`

  useEffect(() => {
    document.title = `${t('project.settings.settings')} ${form.name} ${TITLE_SUFFIX}`
  }, [form, t])

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
    <div className='flex min-h-min-footer flex-col bg-gray-50 px-4 py-6 pb-40 dark:bg-slate-900 sm:px-6 lg:px-8'>
      <form className='mx-auto w-full max-w-7xl' onSubmit={handleSubmit}>
        <h2 className='mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50'>{title}</h2>
        <h3 className='mt-4 text-lg font-bold text-gray-900 dark:text-gray-50'>{t('profileSettings.general')}</h3>
        <Input
          name='name'
          label={t('project.settings.name')}
          value={form.name}
          placeholder='My awesome project'
          className='mt-2'
          onChange={handleInput}
          error={beenSubmitted ? errors.name : null}
        />
        <Input
          name='id'
          label={t('project.settings.pid')}
          value={form.id}
          className='mt-4'
          onChange={handleInput}
          error={null}
          disabled
        />
        <Input
          name='sharableLink'
          label={t('project.settings.sharableLink')}
          hint={t('project.settings.sharableDesc')}
          value={sharableLink}
          className='mt-4'
          onChange={handleInput}
          error={null}
          disabled
        />

        <h3 className='mt-6 text-lg font-bold text-gray-900 dark:text-gray-50'>{t('project.settings.shields')}</h3>
        <Input
          name='origins'
          label={t('project.settings.origins')}
          hint={t('project.settings.originsHint')}
          value={form.origins || ''}
          className='mt-2'
          onChange={handleInput}
          error={beenSubmitted ? errors.origins : null}
        />
        <Input
          name='ipBlacklist'
          label={t('project.settings.ipBlacklist')}
          hint={t('project.settings.ipBlacklistHint')}
          value={form.ipBlacklist || ''}
          className='mt-4'
          onChange={handleInput}
          error={beenSubmitted ? errors.ipBlacklist : null}
        />
        <div className='mt-4'>
          <Select
            id='botsProtectionLevel'
            label={t('project.settings.botsProtectionLevel.title')}
            // @ts-expect-error
            items={botsProtectionLevels}
            title={_find(botsProtectionLevels, (predicate) => predicate.name === form.botsProtectionLevel)?.title || ''}
            labelExtractor={(item: any) => item.title}
            onSelect={(item) => {
              setForm((prevForm) => ({
                ...prevForm,
                botsProtectionLevel: item.name,
              }))
            }}
            capitalise
          />
        </div>

        <h3 className='mt-6 text-lg font-bold text-gray-900 dark:text-gray-50'>{t('project.settings.access')}</h3>
        <Checkbox
          checked={Boolean(form.active)}
          onChange={(checked) =>
            setForm((prev) => ({
              ...prev,
              active: checked,
            }))
          }
          name='active'
          className='mt-2'
          label={t('project.settings.enabled')}
          hint={t('project.settings.enabledHint')}
        />
        <Checkbox
          checked={Boolean(form.public)}
          onChange={(checked) => {
            if (!form.isPasswordProtected) {
              setForm((prev) => ({
                ...prev,
                public: checked,
              }))
            }
          }}
          name='public'
          className='mt-4'
          label={t('project.settings.public')}
          hint={t('project.settings.publicHint')}
        />
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
          name='isPasswordProtected'
          className='mt-4'
          label={t('project.settings.protected')}
          hint={t('project.settings.protectedHint')}
        />
        {organisations.length > 1 && (
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
              onSelect={async (item) => {
                await assignOrganisation(item.id)
                setForm((oldForm) => ({
                  ...oldForm,
                  organisationId: item.id,
                }))
              }}
              label={t('project.settings.organisation')}
              title={organisations.find((org) => org.id === form.organisationId)?.name}
            />
          </div>
        )}
        <div className='mt-8 flex flex-wrap justify-center gap-2 sm:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              className='border-indigo-100 dark:border-slate-700/50 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
              as={Link}
              // @ts-expect-error
              to={_replace(routes.project, ':id', id)}
              secondary
              regular
            >
              {t('common.cancel')}
            </Button>
            <Button type='submit' loading={isSaving} primary regular>
              {t('common.save')}
            </Button>
          </div>
          {project.role === 'owner' ? (
            <div className='flex flex-wrap justify-center gap-2'>
              {!isSelfhosted && (
                <Button onClick={() => setShowTransfer(true)} semiDanger semiSmall>
                  <>
                    <ArrowLeftRight className='mr-1 h-5 w-5' />
                    {t('project.settings.transfer')}
                  </>
                </Button>
              )}
              <Button onClick={() => !setResetting && setShowReset(true)} loading={isDeleting} semiDanger semiSmall>
                <>
                  <RotateCcw className='mr-1 h-5 w-5' />
                  {t('project.settings.reset')}
                </>
              </Button>
              <Button onClick={() => !isDeleting && setShowDelete(true)} loading={isDeleting} danger semiSmall>
                <>
                  <TrashIcon className='mr-1 h-5 w-5' />
                  {t('project.settings.delete')}
                </>
              </Button>
            </div>
          ) : null}
        </div>
        {!isSelfhosted && (
          <>
            <hr className='mt-8 border-gray-200 dark:border-gray-600 xs:mt-2 sm:mt-5' />
            <Emails projectId={id} />
          </>
        )}
        {!isSelfhosted && (
          <>
            <hr className='mt-2 border-gray-200 dark:border-gray-600 sm:mt-5' />
            <People project={project} />
          </>
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
        message={
          <ModalMessage
            setDateRange={setDateRange}
            dateRange={dateRange}
            setTab={setTab}
            tab={tab}
            pid={id}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            filterType={filterType}
            setFilterType={setFilterType}
          />
        }
        submitType='danger'
        type='error'
        isOpened={showReset}
      />
      <Modal
        onClose={() => {
          setShowProtected(false)
          setForm((prev) => ({
            ...prev,
            password: undefined,
          }))
        }}
        onSubmit={onProtected}
        submitText={t('common.save')}
        closeText={t('common.cancel')}
        title={t('project.settings.protected')}
        message={
          <div>
            <p className='mb-4 mt-1 text-sm text-gray-500 dark:text-gray-300'>{t('project.settings.protectedHint')}</p>
            <Input
              name='password'
              type='password'
              label={t('project.settings.password')}
              value={form?.password || ''}
              className='mt-4 px-4 sm:px-0'
              onChange={handleInput}
              error={beenSubmitted ? errors.password : null}
            />
          </div>
        }
        isOpened={showProtected}
      />
      <Modal
        onClose={() => {
          setShowTransfer(false)
        }}
        submitText={t('project.settings.transfer')}
        closeText={t('common.cancel')}
        message={
          <div>
            <h2 className='text-xl font-bold text-gray-700 dark:text-gray-200'>{t('project.settings.transferTo')}</h2>
            <p className='mt-2 text-base text-gray-700 dark:text-gray-200'>
              {t('project.settings.transferHint', {
                name: form.name || DEFAULT_PROJECT_NAME,
              })}
            </p>
            <Input
              name='email'
              type='email'
              label={t('project.settings.transfereeEmail')}
              value={transferEmail}
              placeholder='you@example.com'
              className='mt-4'
              onChange={(e) => setTransferEmail(e.target.value)}
            />
          </div>
        }
        isOpened={showTransfer}
        onSubmit={onTransfer}
      />
    </div>
  )
}

export default withAuthentication(ProjectSettings, auth.authenticated)
