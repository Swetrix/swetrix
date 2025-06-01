import { Params } from '../interfaces/traffic'

import ProjectDropdown from './ProjectDropdown'

const OPTIONS = [
  {
    label: 'project.mapping.os',
    value: 'os',
  },
  {
    label: 'project.mapping.osv',
    value: 'osv',
  },
] as const

interface OSDropdownProps {
  onSelect: (value: (typeof OPTIONS)[number]['value']) => void
  title: string
  data: Params
}

const OSDropdown = ({ onSelect, title, data }: OSDropdownProps) => {
  return <ProjectDropdown title={title} options={OPTIONS} onSelect={onSelect} headerKey='project.osInfo' data={data} />
}

export default OSDropdown
