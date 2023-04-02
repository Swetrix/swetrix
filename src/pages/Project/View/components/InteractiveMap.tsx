import React, { memo, useState } from 'react'
import cx from 'clsx'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import countries from 'utils/isoCountries'
import { PROJECT_TABS } from 'redux/constants'
import { StateType } from 'redux/store'
import { getTimeFromSeconds, getStringFromTime } from 'utils/generic'

import countriesList from 'utils/countries'
import { useSelector } from 'react-redux'

const InteractiveMap = ({ data, onClickCountry, total }: {
  data: Record<string, number>
  onClickCountry: (country: string) => void
  total: number
}) => {
  const { t, i18n: { language } } = useTranslation('common')
  const [hoverShow, setHoverShow] = useState<boolean>(false)
  const [dataHover, setDataHover] = useState<{
    countries: string
    data: number
  }>({} as {
    countries: string
    data: number
  })
  const [cursorPosition, setCursorPosition] = useState<{
    pageX: number
    pageY: number
  }>({} as {
    pageX: number
    pageY: number
  })

  const projectTab = useSelector((state: StateType) => state.ui.projects.projectTab)
  const isTrafficTab = projectTab === PROJECT_TABS.traffic

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
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
            const ccData = data[index] || 0
            const perc = ((ccData / total) * 100) || 0

            return (
              <path
                key={index}
                id={index}
                className={isTrafficTab
                  ? cx({
                    'hover:opacity-90': perc > 0,
                    'fill-[#cfd1d4] dark:fill-[#465d7e46]': perc === 0,
                    'fill-[#92b2e7] dark:fill-[#292d77]': perc > 0 && perc < 3,
                    'fill-[#6f9be3] dark:fill-[#363391]': perc >= 3 && perc < 10,
                    'fill-[#5689db] dark:fill-[#4842be]': perc >= 10 && perc < 20,
                    'fill-[#3b82f6] dark:fill-[#6357ff]': perc >= 20,
                    'cursor-pointer': Boolean(ccData),
                  }) : cx({
                    'hover:opacity-90': ccData > 0,
                    'fill-[#cfd1d4] dark:fill-[#465d7e46]': ccData === 0,
                    'fill-[#92b2e7] dark:fill-[#292d77]': ccData > 0 && ccData < 1,
                    'fill-[#6f9be3] dark:fill-[#363391]': ccData >= 1 && ccData < 2,
                    'fill-[#5689db] dark:fill-[#4842be]': ccData >= 2 && ccData < 3,
                    'fill-[#3b82f6] dark:fill-[#6357ff]': ccData >= 3 && ccData < 5,
                    'fill-[#f78a8a]': ccData >= 5 && ccData < 7,
                    'fill-[#f76b6b]': ccData >= 7 && ccData < 10,
                    'fill-[#f74b4b]': ccData >= 10,
                    'cursor-pointer': Boolean(ccData),
                  })}
                d={item.d}
                onClick={() => perc !== 0 && onClickCountry(index)}
                onMouseEnter={() => {
                  if (ccData) {
                    setHoverShow(true)
                    setDataHover({
                      countries: countries.getName(index, language),
                      data: ccData,
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
            {isTrafficTab ? t('project.unique') : t('dashboard.pageLoad')}
            :
            &nbsp;
            <strong
              className={cx({
                'dark:text-indigo-400': isTrafficTab || dataHover.data < 5,
                'dark:text-red-400': !isTrafficTab && dataHover.data >= 5,
              })}
            >
              {isTrafficTab ? dataHover.data : getStringFromTime(getTimeFromSeconds(dataHover.data), true)}
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
