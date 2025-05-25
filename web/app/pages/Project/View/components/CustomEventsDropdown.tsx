import ProjectDropdown from './ProjectDropdown'

interface CustomEventsDropdownProps {
  onSelect: (value: string) => void
  title: string
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

const CustomEventsDropdown = ({ onSelect, title }: CustomEventsDropdownProps) => {
  return <ProjectDropdown title={title} options={OPTIONS} onSelect={onSelect} headerKey='project.metadata' />
}

export default CustomEventsDropdown
