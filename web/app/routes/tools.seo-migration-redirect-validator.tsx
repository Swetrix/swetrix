import { createTechnicalToolRoute } from '~/components/tools/TechnicalToolRoute'
import { runTechnicalToolAction } from '~/lib/freeTools.server'

const route = createTechnicalToolRoute('seo-migration-redirect-validator')

export const meta = route.meta
export const sitemap = route.sitemap
export const loader = route.loader

export async function action({ request }: { request: Request }) {
  return runTechnicalToolAction(
    'seo-migration-redirect-validator',
    await request.formData(),
  )
}

export default route.Component
