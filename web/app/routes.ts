import { flatRoutes } from '@react-router/fs-routes'
import type { RouteConfigEntry } from '@react-router/dev/routes'

import { localisedLanguages } from './lib/constants'

// Routes that should always stay unprefixed (no /{lang}/... variant).
// Blog content (and the catch-all that powers blog-style pages such as
// /imprint, /comparisons/* etc. through routes/$.tsx) keeps its canonical
// English URL so we don't fragment the SEO of long-form content.
// API and internal endpoints obviously have no localisation either.
const UNPREFIXED_PATH_PATTERNS: RegExp[] = [
  /^blog(\/|$)/,
  /^api(\/|$)/,
  /^backend(\/|$)/,
  /^_internal_data/,
  /^ping$/,
  /\.txt$/,
  /\.xml$/,
]

const isUnprefixedPath = (path: string | undefined): boolean => {
  if (path === '*' || path === undefined) return path === '*'
  return UNPREFIXED_PATH_PATTERNS.some((re) => re.test(path))
}

const cloneSubtreeIds = (
  entry: RouteConfigEntry,
  lang: string,
): RouteConfigEntry => {
  const baseId = entry.id ?? entry.file
  return {
    ...entry,
    id: `${lang}.${baseId}`,
    children: entry.children?.map((c) => cloneSubtreeIds(c, lang)),
  }
}

const cloneTopLevelForLanguage = (
  entry: RouteConfigEntry,
  lang: string,
): RouteConfigEntry => {
  const baseId = entry.id ?? entry.file
  // For the root index route (no path, index: true) we surface it as /{lang}.
  // For all other routes we prepend /{lang}/ to the existing path.
  const newPath = entry.path ? `${lang}/${entry.path}` : lang

  return {
    ...entry,
    id: `${lang}.${baseId}`,
    path: newPath,
    index: undefined,
    children: entry.children?.map((c) => cloneSubtreeIds(c, lang)),
  }
}

const buildRoutes = async (): Promise<RouteConfigEntry[]> => {
  const baseRoutes = await flatRoutes()

  const localisableRoutes = baseRoutes.filter((r) => !isUnprefixedPath(r.path))

  const localisedRoutes: RouteConfigEntry[] = []
  for (const lang of localisedLanguages) {
    for (const r of localisableRoutes) {
      localisedRoutes.push(cloneTopLevelForLanguage(r, lang))
    }
  }

  return [...baseRoutes, ...localisedRoutes]
}

export default buildRoutes()
