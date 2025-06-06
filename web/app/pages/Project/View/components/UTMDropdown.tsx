import { Params } from '../interfaces/traffic'

import ProjectDropdown from './ProjectDropdown'

interface UTMDropdownProps {
  onSelect: (value: string) => void
  title: string
  data: Params
}

const OPTIONS = [
  {
    label: 'project.mapping.so',
    value: 'so',
  },
  {
    label: 'project.mapping.me',
    value: 'me',
  },
  {
    label: 'project.mapping.ca',
    value: 'ca',
  },
  {
    label: 'project.mapping.te',
    value: 'te',
  },
  {
    label: 'project.mapping.co',
    value: 'co',
  },
]

const UTMDropdown = ({ onSelect, title, data }: UTMDropdownProps) => {
  return (
    <ProjectDropdown title={title} options={OPTIONS} onSelect={onSelect} headerKey='project.campaigns' data={data} />
  )
}

export default UTMDropdown
