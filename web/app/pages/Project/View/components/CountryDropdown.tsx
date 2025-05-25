import ProjectDropdown from './ProjectDropdown'

interface CountryDropdownProps {
  onSelect: (value: string) => void
  title: string
}

const OPTIONS = [
  {
    label: 'project.mapping.cc',
    value: 'cc',
  },
  {
    label: 'project.mapping.rg',
    value: 'rg',
  },
  {
    label: 'project.mapping.ct',
    value: 'ct',
  },
]

const CountryDropdown = ({ onSelect, title }: CountryDropdownProps) => {
  return <ProjectDropdown title={title} options={OPTIONS} onSelect={onSelect} headerKey='project.geo' />
}

export default CountryDropdown
