import countries from 'i18n-iso-countries'
import countriesDe from 'i18n-iso-countries/langs/de.json'
import countriesEn from 'i18n-iso-countries/langs/en.json'
import countriesFr from 'i18n-iso-countries/langs/fr.json'
import countriesPl from 'i18n-iso-countries/langs/pl.json'
import countriesUk from 'i18n-iso-countries/langs/uk.json'

console.log('countriesEn:', countriesEn)

countries.registerLocale({
  locale: 'en',
  countries: {
    ...countriesEn.countries,
    TW: 'Taiwan',
    US: 'United States',
    CN: 'China',
    RU: 'Russia',
  },
})
countries.registerLocale({
  locale: 'uk',
  countries: {
    ...countriesUk.countries,
    TW: 'Тайвань',
  },
})
countries.registerLocale(countriesPl)
countries.registerLocale({
  locale: 'de',
  countries: {
    ...countriesDe.countries,
    US: 'Vereinigte Staaten',
  },
})
countries.registerLocale(countriesFr)

export default countries
