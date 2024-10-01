import countries from 'i18n-iso-countries'
import countriesEn from 'i18n-iso-countries/langs/en.json'
import countriesDe from 'i18n-iso-countries/langs/de.json'
import countriesUk from 'i18n-iso-countries/langs/uk.json'
import countriesPl from 'i18n-iso-countries/langs/pl.json'

countries.registerLocale(countriesEn)
countries.registerLocale(countriesUk)
countries.registerLocale(countriesPl)
countries.registerLocale(countriesDe)

export default countries
