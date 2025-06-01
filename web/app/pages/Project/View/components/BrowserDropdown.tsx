import { Params } from '../interfaces/traffic'

import ProjectDropdown from './ProjectDropdown'

const OPTIONS = [
  {
    label: 'project.mapping.br',
    value: 'br',
  },
  {
    label: 'project.mapping.brv',
    value: 'brv',
  },
] as const

interface BrowserDropdownProps {
  onSelect: (value: (typeof OPTIONS)[number]['value']) => void
  title: string
  data: Params
}

const BrowserDropdown = ({ onSelect, title, data }: BrowserDropdownProps) => {
  return (
    <ProjectDropdown title={title} options={OPTIONS} onSelect={onSelect} headerKey='project.browserInfo' data={data} />
  )
}

export default BrowserDropdown
