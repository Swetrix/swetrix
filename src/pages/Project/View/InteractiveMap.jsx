import React, { memo } from 'react'
import cx from 'clsx'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import countries from 'i18n-iso-countries'
import countriesEn from 'i18n-iso-countries/langs/en.json'
import countriesDe from 'i18n-iso-countries/langs/de.json'
import countriesEl from 'i18n-iso-countries/langs/el.json'
import countriesHi from 'i18n-iso-countries/langs/hi.json'
import countriesUk from 'i18n-iso-countries/langs/uk.json'
import countriesZh from 'i18n-iso-countries/langs/zh.json'
import countriesRu from 'i18n-iso-countries/langs/ru.json'
import countriesSv from 'i18n-iso-countries/langs/sv.json'

import countriesList from 'utils/countries'

countries.registerLocale(countriesEn)
countries.registerLocale(countriesDe)
countries.registerLocale(countriesEl)
countries.registerLocale(countriesRu)
countries.registerLocale(countriesHi)
countries.registerLocale(countriesUk)
countries.registerLocale(countriesZh)
countries.registerLocale(countriesSv)

const InteractiveMap = ({ data, onClickCountry, total }) => {
  const { t, i18n: { language } } = useTranslation('common')

  return (
    <svg id='map' viewBox='0 0 1050 650' className='w-full h-full'>
      <g>
        {_map(countriesList, (item, index) => {
          const perc = ((data[index] / total) * 100) || 0
          const title = `${countries.getName(index, language)}\n${t('project.unique')}: ${data[index] || 0}`

          return (
            <path
              key={index}
              id={index}
              className={cx('cursor-pointer', {
                'hover:opacity-90': perc > 0,
                'fill-[#cfd1d4] dark:fill-[#374151]': perc === 0,
                'fill-[#92b2e7] dark:fill-[#43448c]': perc > 0 && perc < 3,
                'fill-[#6f9be3] dark:fill-[#4642bf]': perc >= 3 && perc < 10,
                'fill-[#5689db] dark:fill-[#4a42db]': perc >= 10 && perc < 20,
                'fill-[#3b82f6] dark:fill-[#4035dc]': perc >= 20,
              })}
              d={item.d}
              onClick={() => perc !== 0 && onClickCountry(index)}
            >
              <title>
                {title}
              </title>
            </path>
          )
        })}
      </g>
    </svg>
  )
}

InteractiveMap.propTypes = {
  onClickCountry: PropTypes.func,
  data: PropTypes.objectOf(PropTypes.number),
  total: PropTypes.number,
}

InteractiveMap.defaultProps = {
  data: {},
  onClickCountry: () => { },
  total: 0,
}

export default memo(InteractiveMap)
