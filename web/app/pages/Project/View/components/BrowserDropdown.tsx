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
}

const BrowserDropdown = ({ onSelect, title }: BrowserDropdownProps) => {
  return <ProjectDropdown title={title} options={OPTIONS} onSelect={onSelect} headerKey='project.browserInfo' />
}

export default BrowserDropdown
