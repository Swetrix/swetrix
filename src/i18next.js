import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import _isString from 'lodash/isString'
import { whitelist, defaultLanguage } from 'redux/constants'
import { setItem } from 'utils/localstorage'
import en from './i18n/en.json'
import ru from './i18n/ru.json'
import uk from './i18n/uk.json'
import de from './i18n/de.json'
import hi from './i18n/hi.json'
import zh from './i18n/zh.json'

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
  .use(lngDetector)
  .init({
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
    resources: {
      en: { common: en },
      ru: { common: ru },
      uk: { common: uk },
      de: { common: de },
      hi: { common: hi },
      zh: { common: zh },
    },
  })

export default i18next
