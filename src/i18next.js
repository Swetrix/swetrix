import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import backend from 'i18next-http-backend'
import _isString from 'lodash/isString'
import { whitelist, defaultLanguage } from 'redux/constants'
import { setItem } from 'utils/localstorage'

const lngDetector = new LanguageDetector()
lngDetector.addDetector({
  name: 'customDetector',
  lookup() {
    const language = navigator.language || navigator.userLanguage

    if (_isString(language)) {
      return language.substring(0, 2)
    }

    return defaultLanguage
  },
  cacheUserLanguage(lng) {
    setItem('language', lng)
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
      order: ['localStorage', 'customDetector'],
      lookupLocalStorage: 'language',
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

export default i18next
