import { useTranslation } from 'react-i18next'
import { useLocation } from '@remix-run/react'
import _startsWith from 'lodash/startsWith'
import _toUpper from 'lodash/toUpper'
// import { MAIN_URL } from 'redux/constants'
import { getPageMeta } from 'utils/server'
import { getOgImageUrl } from 'redux/constants'

export const SEO = () => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const { pathname } = useLocation()
  const { title, prefixLessTitle } = getPageMeta(t, undefined, pathname)

  const isBlogPage = _startsWith(pathname, '/blog')
  const isMainPage = pathname === '/'
  const ogImageUrl = getOgImageUrl(prefixLessTitle)

  return (
    <>
      {!isBlogPage && (
        <>
          <title>{title}</title>
          <meta property='og:title' content='Swetrix' />
          <meta name='twitter:title' content='Swetrix | Ultimate open-source web analytics to satisfy all your needs' />
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
              <meta name='twitter:image' content='https://swetrix.com/assets/og_image.png' />
              <meta property='og:image' content='https://swetrix.com/assets/og_image.png' />
            </>
          ) : (
            <>
              <meta name='twitter:image' content={ogImageUrl} />
              <meta property='og:image' content={ogImageUrl} />
            </>
          )}
        </>
      )}
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
