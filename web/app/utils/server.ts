import _includes from 'lodash/includes'
import _startsWith from 'lodash/startsWith'

import { SUPPORTED_THEMES, ThemeType } from '~/lib/constants'

/**
 * Function detects theme based on user's browser hints and cookies
 */
export function detectTheme(request: Request): ThemeType {
  // Stage 1: Check if theme is set via `theme` query param
  const queryTheme = new URL(request.url).searchParams.get(
    'theme',
  ) as ThemeType | null

  if (queryTheme && _includes(SUPPORTED_THEMES, queryTheme)) {
    return queryTheme
  }

  // Stage 2: Check if user has set theme manually
  const cookie = request.headers.get('Cookie')
  const theme = cookie?.match(/(?<=colour-theme=)[^;]*/)?.[0] as ThemeType

  if (_includes(SUPPORTED_THEMES, theme)) {
    return theme
  }

  // Stage 3: Try to detect theme based on Sec-CH browser hints
  // Currently only Chromium-based browsers support this feature
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-Prefers-Color-Scheme
  const hintedTheme = request.headers.get(
    'Sec-CH-Prefers-Color-Scheme',
  ) as ThemeType

  if (_includes(SUPPORTED_THEMES, hintedTheme)) {
    return hintedTheme
  }

  return 'light'
}

export function isWWW(url: URL): boolean {
  return _startsWith(url.hostname, 'www.')
}
