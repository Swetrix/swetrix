import { useTranslation } from 'react-i18next'
import Spin from '~/ui/icons/Spin'

export const MapLoader = () => {
  const { t } = useTranslation('common')

  return (
    <div className='flex h-full w-full items-center justify-center'>
      <div className='flex flex-col items-center gap-2'>
        <Spin />
        <span className='text-sm text-slate-900 dark:text-gray-50'>
          {t('project.loadingMapData')}
        </span>
      </div>
    </div>
  )
}
