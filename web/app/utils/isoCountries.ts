import countries from 'i18n-iso-countries'
import countriesDe from 'i18n-iso-countries/langs/de.json'
import countriesEn from 'i18n-iso-countries/langs/en.json'
import countriesFr from 'i18n-iso-countries/langs/fr.json'
import countriesPl from 'i18n-iso-countries/langs/pl.json'
import countriesUk from 'i18n-iso-countries/langs/uk.json'

countries.registerLocale(countriesEn)
countries.registerLocale(countriesUk)
countries.registerLocale(countriesPl)
countries.registerLocale(countriesDe)
countries.registerLocale(countriesFr)

export default countries
