import { createTechnicalToolRoute } from '~/components/tools/TechnicalToolRoute'
import { runTechnicalToolAction } from '~/lib/freeTools.server'

const route = createTechnicalToolRoute('page-size-checker')

export const meta = route.meta
export const sitemap = route.sitemap
export const loader = route.loader

export async function action({ request }: { request: Request }) {
  return runTechnicalToolAction('page-size-checker', await request.formData())
}

export default route.Component
