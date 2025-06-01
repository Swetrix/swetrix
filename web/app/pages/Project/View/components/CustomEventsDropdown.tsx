import { Params } from '../interfaces/traffic'

import ProjectDropdown from './ProjectDropdown'

interface CustomEventsDropdownProps {
  onSelect: (value: string) => void
  title: string
  data: Params
}

const OPTIONS = [
  {
    label: 'project.customEv',
    value: 'customEv',
  },
  {
    label: 'project.properties',
    value: 'properties',
  },
]

const CustomEventsDropdown = ({ onSelect, title, data }: CustomEventsDropdownProps) => {
  console.log('data:', data)
  return (
    <ProjectDropdown title={title} options={OPTIONS} onSelect={onSelect} headerKey='project.metadata' data={data} />
  )
}

export default CustomEventsDropdown
