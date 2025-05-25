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
}

const PageDropdown = ({ onSelect, title }: PageDropdownProps) => {
  return <ProjectDropdown title={title} options={OPTIONS} onSelect={onSelect} headerKey='project.urlInfo' />
}

export default PageDropdown
