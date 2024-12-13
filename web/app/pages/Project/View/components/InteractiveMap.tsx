import React, { memo, useState, useMemo } from 'react'
import cx from 'clsx'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'
import { useTranslation } from 'react-i18next'
import countries from 'utils/isoCountries'
import { PROJECT_TABS } from 'lib/constants'
import { getTimeFromSeconds, getStringFromTime, nFormatter } from 'utils/generic'

import { Entry } from 'lib/models/Entry'
import countriesList from 'utils/countries'
import { useSearchParams } from '@remix-run/react'
import { useViewProjectContext } from '../ViewProject'

interface InteractiveMapProps {
  data: Entry[]
  onClickCountry: (country: string) => void
  total: number
}

interface CursorPosition {
  pageX: number
  pageY: number
}

interface DataHover {
  countries: string
  data: number
}

interface CountryMap {
  [key: string]: number
}

const InteractiveMap = ({ data, onClickCountry, total }: InteractiveMapProps) => {
  const { dataLoading } = useViewProjectContext()
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const [hoverShow, setHoverShow] = useState(false)
  const [dataHover, setDataHover] = useState<DataHover>({} as DataHover)
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({} as CursorPosition)
  const countryMap: CountryMap = useMemo(
    () => _reduce(data, (prev, curr) => ({ ...prev, [curr.cc || curr.name]: curr.count }), {}),
    [data],
  )

  const isTrafficTab = searchParams.get('tab') === PROJECT_TABS.traffic

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pageX = e.clientX - rect.left
    const pageY = e.clientY - rect.top
    setCursorPosition({ pageX, pageY })
  }

  return (
    <div className='relative'>
      <svg id='map' viewBox='0 0 1050 650' className='h-full w-full' onMouseMove={onMouseMove}>
        <g>
          {_map(countriesList, (key, value) => {
            const ccData = countryMap[value] || 0
            const perc = (ccData / total) * 100 || 0

            return (
              <path
                key={value}
                id={value}
                className={cx(
                  isTrafficTab
                    ? {
                        'hover:opacity-90': perc > 0,
                        'fill-[#cfd1d4] dark:fill-[#465d7e46]': perc === 0,
                        'fill-[#92b2e7] dark:fill-[#292d77]': perc > 0 && perc < 3,
                        'fill-[#6f9be3] dark:fill-[#363391]': perc >= 3 && perc < 10,
                        'fill-[#5689db] dark:fill-[#4842be]': perc >= 10 && perc < 20,
                        'fill-[#3b82f6] dark:fill-[#6357ff]': perc >= 20,
                      }
                    : {
                        'hover:opacity-90': ccData > 0,
                        'fill-[#cfd1d4] dark:fill-[#465d7e46]': ccData === 0,
                        'fill-[#92b2e7] dark:fill-[#292d77]': ccData > 0 && ccData < 1,
                        'fill-[#6f9be3] dark:fill-[#363391]': ccData >= 1 && ccData < 2,
                        'fill-[#5689db] dark:fill-[#4842be]': ccData >= 2 && ccData < 3,
                        'fill-[#3b82f6] dark:fill-[#6357ff]': ccData >= 3 && ccData < 5,
                        'fill-[#f78a8a]': ccData >= 5 && ccData < 7,
                        'fill-[#f76b6b]': ccData >= 7 && ccData < 10,
                        'fill-[#f74b4b]': ccData >= 10,
                      },
                  {
                    'cursor-pointer': Boolean(ccData) && !dataLoading,
                    'cursor-wait': dataLoading,
                  },
                )}
                d={key.d}
                onClick={() => perc !== 0 && onClickCountry(value)}
                onMouseEnter={() => {
                  if (ccData) {
                    setHoverShow(true)
                    setDataHover({
                      countries: countries.getName(value, language) as string,
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
            className='dark:shadow-gray-850 dark:border-gray-850 absolute z-30 rounded-md border bg-gray-100 p-1 text-xs dark:bg-slate-900 dark:text-gray-200'
            style={{
              top: cursorPosition.pageY + 20,
              left: cursorPosition.pageX - 20,
            }}
          >
            <strong>{dataHover.countries}</strong>
            <br />
            {isTrafficTab ? t('project.unique') : t('dashboard.pageLoad')}: &nbsp;
            <strong
              className={cx({
                'dark:text-indigo-400': isTrafficTab || dataHover.data < 5,
                'dark:text-red-400': !isTrafficTab && dataHover.data >= 5,
              })}
            >
              {isTrafficTab
                ? nFormatter(dataHover.data, 1)
                : getStringFromTime(getTimeFromSeconds(dataHover.data), true)}
            </strong>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(InteractiveMap)
