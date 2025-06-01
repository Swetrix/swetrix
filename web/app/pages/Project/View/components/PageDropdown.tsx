import { Params } from '../interfaces/traffic'

import ProjectDropdown from './ProjectDropdown'

const OPTIONS = [
  {
    label: 'project.mapping.pg',
    value: 'pg',
  },
  {
    label: 'project.mapping.host',
    value: 'host',
  },
] as const

interface PageDropdownProps {
  onSelect: (value: (typeof OPTIONS)[number]['value']) => void
  title: string
  data: Params
}

const PageDropdown = ({ onSelect, title, data }: PageDropdownProps) => {
  return <ProjectDropdown title={title} options={OPTIONS} onSelect={onSelect} headerKey='project.urlInfo' data={data} />
}

export default PageDropdown
