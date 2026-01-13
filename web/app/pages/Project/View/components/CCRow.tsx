import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import Flag from '~/ui/Flag'
import countries from '~/utils/isoCountries'

interface CCRowProps {
  cc: string | null
  name?: string
  language: string
  size?: number
}

const CCRow = ({ cc, name, language, size = 21 }: CCRowProps) => {
  const { t } = useTranslation('common')

  return (
    <>
      <Flag
        className='rounded-xs'
        country={cc}
        size={size}
        alt=''
        aria-hidden='true'
      />
      &nbsp;
      {name ||
        (cc ? (
          countries.getName(cc, language)
        ) : (
          <span className='italic'>{t('common.unknown')}</span>
        ))}
    </>
  )
}

export default memo(CCRow)
