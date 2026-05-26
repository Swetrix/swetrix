import { useTranslation } from 'react-i18next'

import Spin from './icons/Spin'
import { cn } from '~/utils/generic'

interface LoaderProps {
  className?: string
  label?: string
}

const Loader = ({ className, label }: LoaderProps) => {
  const { t } = useTranslation('common')

  return (
    <output
      className={cn('flex items-center justify-center pt-10', className)}
      aria-live='polite'
    >
      <Spin className='mr-0! ml-0!' />
      <span className='sr-only'>{label ?? t('common.loading')}</span>
    </output>
  )
}

export default Loader
