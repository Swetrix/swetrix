import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { getGSCKeywords } from '~/api'
import { useCurrentProject, useProjectPassword } from '~/providers/CurrentProjectProvider'
import Loader from '~/ui/Loader'
import routes from '~/utils/routes'

import { useViewProjectContext } from '../ViewProject'
import { getFormatDate } from '../ViewProject.helpers'

const Keywords = () => {
  const { id, project } = useCurrentProject()
  const projectPassword = useProjectPassword(id)
  const { t } = useTranslation('common')
  const { dateRange, period, timezone } = useViewProjectContext()

  const [isLoading, setIsLoading] = useState<boolean | null>(null)
  const [keywords, setKeywords] = useState<{ name: string; count: number }[]>([])
  const [notConnected, setNotConnected] = useState(false)

  const [from, to] = useMemo(() => {
    if (!dateRange) {
      return [undefined, undefined]
    }
    return [getFormatDate(dateRange[0]), getFormatDate(dateRange[1])]
  }, [dateRange])

  const fetchKeywords = async () => {
    if (isLoading) return
    setIsLoading(true)
    setNotConnected(false)
    try {
      const res = await getGSCKeywords(id, period, from, to, timezone, projectPassword)
      setKeywords(res.keywords || [])
    } catch (error: any) {
      const message = typeof error === 'string' ? error : error?.message
      if (message && (message as string).toLowerCase().includes('search console')) {
        setNotConnected(true)
      } else {
        toast.error(typeof error === 'string' ? error : t('apiNotifications.somethingWentWrong'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchKeywords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, from, to, timezone, id])

  if (isLoading || isLoading === null) {
    return <Loader />
  }

  if (notConnected) {
    return (
      <div className='mt-4 text-center'>
        <p className='text-sm text-gray-800 dark:text-gray-200'>
          {['owner', 'admin'].includes(project?.role || '')
            ? t('project.connectGsc')
            : t('project.gscConnectionRequired')}
        </p>
        {['owner', 'admin'].includes(project?.role || '') ? (
          <Link
            to={`${routes.project_settings.replace(':id', id)}?tab=integrations`}
            className='mt-2 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700'
          >
            {t('project.goToProjectSettings')}
          </Link>
        ) : null}
      </div>
    )
  }

  if (_isEmpty(keywords)) {
    return (
      <p className='mt-4 text-center text-sm text-gray-800 italic dark:text-gray-200'>{t('project.noKeywordsFound')}</p>
    )
  }

  return (
    <div className='max-h-[500px] overflow-y-auto'>
      <table className='w-full border-separate border-spacing-y-1'>
        <thead className='sticky top-0 z-10 bg-white dark:bg-slate-900'>
          <tr className='text-base text-gray-900 dark:text-gray-50'>
            <th className='w-2/3 pl-2 text-left'>{t('project.keyword')}</th>
            <th className='w-1/3 pr-2 text-right'>{t('project.clicks')}</th>
          </tr>
        </thead>
        <tbody>
          {_map(keywords, (k) => (
            <tr key={`${k.name}-${k.count}`}>
              <td className='rounded-l-md bg-gray-50 p-2 text-sm text-gray-900 dark:bg-slate-800 dark:text-gray-50'>
                {k.name || t('common.notSet')}
              </td>
              <td className='rounded-r-md bg-gray-50 p-2 text-right text-sm text-gray-900 dark:bg-slate-800 dark:text-gray-50'>
                {k.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Keywords
