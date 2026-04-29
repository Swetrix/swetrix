import { useTranslation } from 'react-i18next'

import { useTheme } from '~/providers/ThemeProvider'
import { Text } from '~/ui/Text'
import { cn } from '~/utils/generic'

interface ImageLogo {
  type: 'image'
  name: string
  light: string
  /** Optional dark-mode variant. If absent, the light asset is recoloured via CSS. */
  dark?: string
  /** Tailwind height class — tuned per-logo for optical balance. */
  heightClass: string
}

const LOGOS: ImageLogo[] = [
  {
    type: 'image',
    name: 'Casterlabs',
    light: '/assets/users/casterlabs-light.svg',
    dark: '/assets/users/casterlabs-dark.svg',
    heightClass: 'h-9',
  },
  {
    type: 'image',
    name: 'Phalcode',
    light: '/assets/users/phalcode-light.svg',
    dark: '/assets/users/phalcode-dark.svg',
    heightClass: 'h-6',
  },
  {
    type: 'image',
    name: 'Caritas',
    light: '/assets/users/caritas.svg',
    heightClass: 'h-7',
  },
  {
    type: 'image',
    name: 'Tonomo',
    light: '/assets/users/tonomo-light.svg',
    dark: '/assets/users/tonomo-dark.svg',
    heightClass: 'h-7',
  },
  {
    type: 'image',
    name: 'Stelp',
    light: '/assets/users/stelp.png',
    heightClass: 'h-7',
  },
  {
    type: 'image',
    name: 'AE Studio',
    light: '/assets/users/aestudio-light.svg',
    dark: '/assets/users/aestudio-dark.svg',
    heightClass: 'h-7',
  },
]

export const LogoCloud = () => {
  const { t } = useTranslation('common')
  const { theme } = useTheme()

  return (
    <section className='rounded-b-4xl bg-gray-100/80 pt-14 pb-16 dark:bg-slate-900/50'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <Text
          as='p'
          size='xs'
          weight='semibold'
          colour='muted'
          className='text-center tracking-[0.18em] uppercase'
        >
          {t('main.logoCloud.title')}
        </Text>

        <ul className='mx-auto mt-10 grid max-w-5xl grid-cols-2 items-center justify-items-center gap-x-8 gap-y-10 sm:grid-cols-3 sm:gap-x-12 lg:max-w-6xl lg:grid-cols-6 lg:gap-x-8'>
          {LOGOS.map((logo) => (
            <li
              key={logo.name}
              className='flex w-full items-center justify-center'
            >
              <img
                alt={logo.name}
                src={logo.dark && theme === 'dark' ? logo.dark : logo.light}
                loading='lazy'
                className={cn(
                  'w-auto max-w-[180px] object-contain',
                  logo.heightClass,
                  !logo.dark && 'dark:brightness-0 dark:invert',
                )}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
