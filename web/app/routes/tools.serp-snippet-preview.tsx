import { createTechnicalToolRoute } from '~/components/tools/TechnicalToolRoute'

const route = createTechnicalToolRoute('serp-snippet-preview')

export const meta = route.meta
export const sitemap = route.sitemap
export const loader = route.loader

export default route.Component
