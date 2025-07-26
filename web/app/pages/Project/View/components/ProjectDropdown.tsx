import { useTranslation } from 'react-i18next'

import { Badge } from '~/ui/Badge'
import Dropdown from '~/ui/Dropdown'

import { Params } from '../interfaces/traffic'

interface ProjectDropdownOption {
  readonly label: string
  readonly value: string
}

interface ProjectDropdownProps<T extends string = string> {
  onSelect: (value: T) => void
  title: string
  options: readonly ProjectDropdownOption[]
  headerKey: string
  data: Params
}

const ProjectDropdown = <T extends string = string>({
  onSelect,
  title,
  options,
  headerKey,
  data,
}: ProjectDropdownProps<T>) => {
  const { t } = useTranslation()

  return (
    <Dropdown
      title={title}
      items={options as ProjectDropdownOption[]}
      onSelect={(item, _e, close) => {
        onSelect(item.value as T)
        close()
      }}
      selectItemClassName='flex items-center justify-between space-x-4'
      labelExtractor={(item) => (
        <>
          <span>{t(item.label)}</span>
          {data?.[item.value] ? <Badge colour='slate' label={data[item.value].length.toString()} /> : null}
        </>
      )}
      keyExtractor={(item) => item.value}
      header={t(headerKey)}
      headless
      buttonClassName='cursor-pointer !p-0 text-lg font-semibold flex items-center text-gray-900 dark:text-gray-50'
      className='relative inline-block'
      menuItemsClassName='absolute top-4 left-5 z-20 mt-2 max-h-[200px] !min-w-[220px] overflow-auto'
      chevron='mini'
    />
  )
}

export default ProjectDropdown
