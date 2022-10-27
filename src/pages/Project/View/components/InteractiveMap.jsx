import React, { memo, useState } from 'react'
import cx from 'clsx'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import countries from 'utils/isoCountries'

import countriesList from 'utils/countries'

const InteractiveMap = ({ data, onClickCountry, total }) => {
  const { t, i18n: { language } } = useTranslation('common')
  const [hoverShow, setHoverShow] = useState(false)
  const [dataHover, setDataHover] = useState(null)
  const [cursorPosition, setCursorPosition] = useState(null)

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pageX = e.clientX - rect.left
    const pageY = e.clientY - rect.top
    setCursorPosition({ pageX, pageY })
  }

  return (
    <div className='relative'>
      <svg id='map' viewBox='0 0 1050 650' className='w-full h-full' onMouseMove={onMouseMove}>
        <g>
          {_map(countriesList, (item, index) => {
            const visitors = data[index] || 0
            const perc = ((visitors / total) * 100) || 0

            return (
              <path
                key={index}
                id={index}
                className={cx({
                  'hover:opacity-90': perc > 0,
                  'fill-[#cfd1d4] dark:fill-[#465d7e46]': perc === 0,
                  'fill-[#92b2e7] dark:fill-[#292d77]': perc > 0 && perc < 3,
                  'fill-[#6f9be3] dark:fill-[#363391]': perc >= 3 && perc < 10,
                  'fill-[#5689db] dark:fill-[#4842be]': perc >= 10 && perc < 20,
                  'fill-[#3b82f6] dark:fill-[#6357ff]': perc >= 20,
                  'cursor-pointer': Boolean(visitors),
                })}
                d={item.d}
                onClick={() => perc !== 0 && onClickCountry(index)}
                onMouseEnter={() => {
                  if (visitors) {
                    setHoverShow(true)
                    setDataHover({
                      countries: countries.getName(index, language),
                      data: visitors,
                    })
                  }
                }}
                onMouseLeave={() => {
                  setHoverShow(false)
                }}
              />
            )
          })}
        </g>
      </svg>
      <div>
        {hoverShow && cursorPosition && (
          <div
            className='border absolute z-30 text-xs bg-gray-100 dark:bg-gray-800 dark:shadow-gray-850 dark:border-gray-850 dark:text-gray-200 p-1 rounded-md'
            style={{
              top: cursorPosition.pageY + 20,
              left: cursorPosition.pageX - 20,
            }}
          >
            <strong>{dataHover.countries}</strong>
            <br />
            {t('project.unique')}
            :
            &nbsp;
            <strong className='dark:text-indigo-400'>
              {dataHover.data}
            </strong>
          </div>
        )}
      </div>
    </div>
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
