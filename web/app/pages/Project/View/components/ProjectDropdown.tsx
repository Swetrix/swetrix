import { useTranslation } from 'react-i18next'

import Dropdown from '~/ui/Dropdown'

interface ProjectDropdownOption {
  readonly label: string
  readonly value: string
}

interface ProjectDropdownProps<T extends string = string> {
  onSelect: (value: T) => void
  title: string
  options: readonly ProjectDropdownOption[]
  headerKey: string
}

const ProjectDropdown = <T extends string = string>({
  onSelect,
  title,
  options,
  headerKey,
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
      labelExtractor={(item) => t(item.label)}
      keyExtractor={(item) => item.value}
      header={t(headerKey)}
      headless
      buttonClassName='cursor-pointer !p-0 text-lg font-semibold flex items-center'
      className='relative inline-block'
      menuItemsClassName='absolute top-4 left-5 z-10 mt-2 max-h-[200px] min-w-[250px] overflow-auto'
      chevron='mini'
    />
  )
}

export default ProjectDropdown
