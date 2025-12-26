import dayjs from 'dayjs'
import timezonePlugin from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import React, { memo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { DEFAULT_TIMEZONE } from '~/lib/constants'
import { useAuth } from '~/providers/AuthProvider'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'

import { useViewProjectContext } from '../ViewProject'

dayjs.extend(utc)
dayjs.extend(timezonePlugin)

const CurrentTime = () => {
  const { t } = useTranslation('common')
  const { timezone = DEFAULT_TIMEZONE, timeFormat } = useViewProjectContext()
  const { isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()

  const isEmbedded = searchParams.get('embedded') === 'true'

  return (
    <div className='mb-2 flex justify-end'>
      <Tooltip
        text={
          <div className='flex flex-col'>
            <Text className='text-gray-50' weight='semibold' size='xs'>
              {t('project.timezoneX', { timezone })}
            </Text>
            {isEmbedded ? null : (
              <Text size='xs' colour='secondary' className='mt-1 text-gray-200'>
                {isAuthenticated ? t('project.changeInSettings') : t('project.signInToChange')}
              </Text>
            )}
          </div>
        }
        tooltipNode={
          <Text size='sm' colour='secondary'>
            <Trans
              i18nKey='project.currentTimeX'
              values={{
                time: dayjs()
                  .utc()
                  .tz(timezone)
                  .format(timeFormat === '12-hour' ? 'h:mm a' : 'HH:mm'),
              }}
              components={{
                url: isEmbedded ? (
                  <span className='border-b border-dashed border-gray-500' />
                ) : (
                  <a
                    href={isAuthenticated ? '/user-settings' : '/login'}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='border-b border-dashed border-gray-500 hover:border-solid hover:text-gray-900 dark:hover:text-white'
                  />
                ),
              }}
            />
          </Text>
        }
      />
    </div>
  )
}

export default memo(CurrentTime)
