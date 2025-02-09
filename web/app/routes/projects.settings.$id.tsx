import type { LoaderFunctionArgs } from 'react-router'
import ProjectSettings from '~/pages/Project/Settings'

export async function loader({ request }: LoaderFunctionArgs) {
  return { requestOrigin: request.headers.get('origin') }
}

export default function Index() {
  return <ProjectSettings />
}
