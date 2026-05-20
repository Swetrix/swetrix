import ProjectViewHeaderActions, {
  ExportType,
} from '../../View/components/ProjectViewHeaderActions'

interface TrafficHeaderActionsProps {
  exportTypes: ExportType[]
}

const TrafficHeaderActions = ({ exportTypes }: TrafficHeaderActionsProps) => {
  return <ProjectViewHeaderActions tnMapping={{}} exportTypes={exportTypes} />
}

export default TrafficHeaderActions
