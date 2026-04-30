import { useTranslation } from 'react-i18next'

import { isSelfhosted } from '~/lib/constants'
import { buttonClasses } from '~/ui/Button'
import { Link } from '~/ui/Link'
import { Text } from '~/ui/Text'
import routes from '~/utils/routes'

const CONTACT_US_URL = `https://swetrix.com${routes.contact}`

const NotFound = () => {
  const { t } = useTranslation('common')

  return (
    <div className='flex min-h-min-footer items-center justify-center bg-gray-50 px-4 py-16 sm:py-24 dark:bg-slate-950'>
      <div className='mx-auto w-full max-w-2xl text-center'>
        <Text
          as='p'
          size='sm'
          weight='semibold'
          colour='muted'
          tracking='wide'
          className='uppercase'
        >
          404
        </Text>
        <Text
          as='h1'
          size='4xl'
          weight='bold'
          className='mt-2 tracking-tight text-balance sm:text-5xl'
        >
          {t('notFoundPage.title')}
        </Text>
        <Text
          as='p'
          size='base'
          colour='secondary'
          className='mx-auto mt-3 max-w-md text-pretty whitespace-pre-line'
        >
          {t('notFoundPage.description')}
        </Text>
        <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
          <Link to={routes.main} className={buttonClasses({ size: 'lg' })}>
            {t('notFoundPage.goHome')}
          </Link>
          {isSelfhosted ? (
            <a
              href={CONTACT_US_URL}
              target='_blank'
              rel='noopener noreferrer'
              className={buttonClasses({ variant: 'secondary', size: 'lg' })}
            >
              {t('notFoundPage.support')}
            </a>
          ) : (
            <Link
              to={routes.contact}
              className={buttonClasses({ variant: 'secondary', size: 'lg' })}
            >
              {t('notFoundPage.support')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotFound
