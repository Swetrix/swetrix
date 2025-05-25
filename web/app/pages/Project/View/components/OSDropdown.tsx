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
}

const OSDropdown = ({ onSelect, title }: OSDropdownProps) => {
  return <ProjectDropdown title={title} options={OPTIONS} onSelect={onSelect} headerKey='project.osInfo' />
}

export default OSDropdown
