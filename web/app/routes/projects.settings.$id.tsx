import { json, type LoaderFunctionArgs } from '@remix-run/node'
import ProjectSettings from 'pages/Project/Settings'

export async function loader({ request }: LoaderFunctionArgs) {
  // return current domain origin, like https://app.swetrix.com
  return json({ requestOrigin: request.headers.get('origin') })
}

export default function Index() {
  return <ProjectSettings />
}
