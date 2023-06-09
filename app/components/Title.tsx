import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import PropTypes from 'prop-types'

import { TITLE_SUFFIX, whitelist } from 'redux/constants'

interface ITitle {
  title?: string
  children: React.ReactNode
}

const Title: React.FC<ITitle> = ({ title, children }) => {
  const { i18n: { language } } = useTranslation('common')

  if (_isEmpty(title)) {
    return (
      <>
        <Helmet>
          <title>Swetrix Analytics</title>
        </Helmet>
        {children}
      </>
    )
  }

  const displayTitle = `${title} ${TITLE_SUFFIX}`
  // const pageURL = `${window.location.origin}${window.location.pathname}`

  return (
    <>
      <Helmet>
        <html lang={language} />
        <title>{displayTitle}</title>
        {/* <meta property='og:title' content={displayTitle} />
        <meta name='twitter:title' content={displayTitle} /> */}
        {_map(whitelist, (lang) => (
          <link key={lang} rel='alternate' hrefLang={lang} href={`${''}?lng=${lang}`} />
        ))}
        <link rel='alternate' hrefLang='x-default' href={''} />
      </Helmet>
      {children}
    </>
  )
}

Title.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
}

Title.defaultProps = {
  title: '',
}

export default Title
