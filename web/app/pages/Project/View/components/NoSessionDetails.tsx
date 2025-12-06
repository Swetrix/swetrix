import { FaceFrownIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'

const NoSessionDetails = () => {
  const { t } = useTranslation('common')

  return (
    <div className='px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8'>
      <div className='mx-auto max-w-max'>
        <main className='sm:flex'>
          <FaceFrownIcon type='giant' className='mb-2 -ml-1.5 h-12 w-12 sm:m-0 sm:h-20 sm:w-20' />
          <div className='sm:ml-6'>
            <div className='sm:border-l sm:border-gray-200 sm:pl-6'>
              <Text as='h1' size='4xl' weight='bold' className='sm:text-5xl'>
                {t('project.noSessionDetails')}
              </Text>
              <Text as='p' size='base' colour='secondary' className='mt-1 max-w-prose whitespace-pre-line'>
                {t('project.noSessionDesc')}
              </Text>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default NoSessionDetails
