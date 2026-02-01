import cx from 'clsx'

import { Text } from '~/ui/Text'

interface TabHeaderProps {
  icon: React.ElementType
  label: string
  description: string
  iconColorClass?: string
}

export const TabHeader = ({
  icon: Icon,
  label,
  description,
  iconColorClass = 'text-gray-500',
}: TabHeaderProps) => {
  return (
    <div className='mb-6'>
      <div className='flex items-start gap-4'>
        <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-gray-200 p-2 dark:border-slate-700'>
          <Icon
            className={cx('h-full w-full', iconColorClass)}
            weight='duotone'
          />
        </div>
        <div>
          <Text as='h2' size='lg' weight='semibold'>
            {label}
          </Text>
          <Text as='p' size='sm' colour='muted'>
            {description}
          </Text>
        </div>
      </div>
      <hr className='mt-6 border-gray-200 dark:border-slate-700/80' />
    </div>
  )
}
