import _startsWith from 'lodash/startsWith'
import _toUpper from 'lodash/toUpper'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { getOgImageUrl } from '~/lib/constants'
import routes from '~/utils/routes'
import { getPageMeta } from '~/utils/server'

export const SEO = () => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { pathname } = useLocation()
  const { title, prefixLessTitle } = getPageMeta(t, undefined, pathname)

  const isBlogPage = _startsWith(pathname, '/blog')
  const isMainPage = pathname === '/'
  const isErrorsPage = pathname === routes.errorTracking
  const isProjectViewPage = _startsWith(pathname, '/projects/')
  const ogImageUrl = getOgImageUrl(prefixLessTitle)

  return (
    <>
      {!isBlogPage ? (
        <>
          <title>{title}</title>
          <meta property='og:title' content='Swetrix' />
          <meta name='twitter:title' content='Swetrix | Understand the story behind your customer clicks and scrolls' />
          <meta
            name='description'
            content='Swetrix is a cookieless, privacy-first and GDPR-compliant Google Analytics alternative'
          />
          <meta
            name='twitter:description'
            content='Swetrix is a cookieless, privacy-first and GDPR-compliant Google Analytics alternative'
          />
          <meta
            property='og:description'
            content='Swetrix is a cookieless, privacy-first and GDPR-compliant Google Analytics alternative'
          />
          {isMainPage ? (
            <>
              <meta name='twitter:image' content='https://swetrix.com/assets/og_image.png?v=1' />
              <meta property='og:image' content='https://swetrix.com/assets/og_image.png?v=1' />
            </>
          ) : null}
          {isErrorsPage ? (
            <>
              <meta name='twitter:image' content='https://swetrix.com/assets/og_image_errors.png?v=1' />
              <meta property='og:image' content='https://swetrix.com/assets/og_image_errors.png?v=1' />
            </>
          ) : null}
          {!isProjectViewPage && !isMainPage && !isErrorsPage ? (
            <>
              <meta name='twitter:image' content={ogImageUrl} />
              <meta property='og:image' content={ogImageUrl} />
            </>
          ) : null}
        </>
      ) : null}
      <meta name='theme-color' content='#818cf8' />
      <meta name='twitter:site' content='@swetrix' />
      <meta name='twitter:card' content='summary_large_image' />
      <meta property='og:site_name' content='Swetrix' />
      <meta property='og:url' content='https://swetrix.com' />
      <meta property='og:type' content='website' />
      <meta name='language' content={_toUpper(language)} />
      <meta httpEquiv='content-language' content={_toUpper(language)} />
    </>
  )
}
