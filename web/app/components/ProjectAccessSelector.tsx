import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Checkbox from '~/ui/Checkbox'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'

interface ProjectAccess {
  allProjects: boolean
  projectIds: string[]
}

interface ProjectAccessSelectorProps {
  projects: { id: string; name: string }[]
  value: ProjectAccess
  onChange: (value: ProjectAccess) => void
  disabled?: boolean
}

export default function ProjectAccessSelector({
  projects,
  value,
  onChange,
  disabled,
}: ProjectAccessSelectorProps) {
  const { t } = useTranslation('common')
  const [search, setSearch] = useState('')
  const visibleProjects = projects.filter((project) =>
    `${project.name} ${project.id}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  return (
    <fieldset disabled={disabled} className='w-full'>
      <legend className='font-medium'>{t('apiKeys.projects')}</legend>
      <Text as='p' size='sm' colour='secondary' className='mt-1'>
        {t('apiKeys.projectsHint')}
      </Text>
      <Checkbox
        label={t('apiKeys.allProjects')}
        checked={value.allProjects}
        disabled={disabled}
        onChange={(allProjects) => onChange({ ...value, allProjects })}
        classes={{ label: 'mt-3' }}
      />
      {value.allProjects ? (
        <Text as='p' size='sm' colour='secondary' className='mt-3'>
          {t('apiKeys.allProjectsHint')}
        </Text>
      ) : (
        <div className='mt-4 w-full'>
          <Input
            aria-label={t('apiKeys.searchProjects')}
            placeholder={t('apiKeys.searchProjects')}
            value={search}
            disabled={disabled}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className='mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-slate-700'>
            {visibleProjects.map((project) => (
              <Checkbox
                key={project.id}
                checked={value.projectIds.includes(project.id)}
                disabled={disabled}
                onChange={(checked) =>
                  onChange({
                    ...value,
                    projectIds: checked
                      ? [...value.projectIds, project.id]
                      : value.projectIds.filter((id) => id !== project.id),
                  })
                }
                classes={{
                  label:
                    'px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 [&>label]:min-w-0 [&>label]:flex-1',
                }}
                label={
                  <span className='flex min-w-0 items-center justify-between gap-3'>
                    <span className='truncate'>{project.name}</span>
                    <Text
                      size='xs'
                      colour='secondary'
                      className='shrink-0 font-mono'
                    >
                      {project.id}
                    </Text>
                  </span>
                }
              />
            ))}
            {!visibleProjects.length ? (
              <Text as='p' size='sm' colour='secondary' className='p-3'>
                {t('apiKeys.noProjects')}
              </Text>
            ) : null}
          </div>
          <Text as='p' size='sm' colour='secondary' className='mt-2'>
            {t('apiKeys.projectsSelected', { count: value.projectIds.length })}
          </Text>
        </div>
      )}
    </fieldset>
  )
}
