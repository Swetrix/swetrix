import { useTranslation } from 'react-i18next'

import { Text } from '~/ui/Text'

const NoOrganisations = () => {
  const { t } = useTranslation('common')

  return (
    <div className='flex flex-col py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-7xl'>
        <Text as='h2' size='2xl' className='mb-4 text-center leading-snug'>
          {t('profileSettings.noOrganisations')}
        </Text>
      </div>
    </div>
  )
}

export default NoOrganisations
