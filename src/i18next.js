import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { whitelist, defaultLanguage } from 'redux/constants'
import { setItem } from 'utils/localstorage'
import en from './i18n/en.json'
import ru from './i18n/ru.json'
import uk from './i18n/uk.json'
import de from './i18n/de.json'
import hi from './i18n/hi.json'

const lngDetector = new LanguageDetector()
lngDetector.addDetector({
  name: 'customDetector',
  lookup() {
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
      order: ['localStorage', 'navigator', 'customDetector'],
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
    },
  })

export default i18next
