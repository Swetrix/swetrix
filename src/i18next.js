import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import backend from 'i18next-http-backend'
import _isString from 'lodash/isString'
import _includes from 'lodash/includes'
import { whitelist, defaultLanguage } from 'redux/constants'
import { setItem, getItem } from 'utils/localstorage'

const lngDetector = new LanguageDetector()
lngDetector.addDetector({
  name: 'customDetector',
  lookup() {
    if (window.localStorage) {
      const lsLang = getItem('language')

      if (_includes(whitelist, lsLang)) {
        return lsLang
      }

      setItem('language', defaultLanguage)
      setItem('i18nextLng', defaultLanguage)
    }

    const language = navigator.language || navigator.userLanguage

    if (_isString(language)) {
      const subLanguage = language.substring(0, 2)

      if (_includes(whitelist, subLanguage)) {
        return subLanguage
      }
    }

    return defaultLanguage
  },
})

i18next
  .use(backend)
  .use(lngDetector)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    detection: {
      order: ['querystring', 'customDetector'],
    },
    interpolation: {
      escapeValue: false,
    },
    fallbackLng: defaultLanguage,
    parseMissingKeyHandler: (key) => {
      if (i18next.isInitialized) {
        console.warn(`Missing translation for ${key}`)
      }
      return key
    },
    whitelist,
    ns: ['common'],
    defaultNS: 'common',
  })

i18next.on('languageChanged', (lng) => {
  document.documentElement.setAttribute('lang', lng)
  setItem('language', lng)
})

export default i18next
