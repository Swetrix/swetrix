import { useSearchParams } from 'react-router'
import { cn } from '~/utils/generic'
import Loader from '~/ui/Loader'

export const LoaderView = () => {
  const [searchParams] = useSearchParams()

  const isEmbedded = searchParams.get('embedded') === 'true'

  return (
    <div
      className={cn('flex flex-col bg-gray-50 dark:bg-slate-900', {
        'min-h-including-header': !isEmbedded,
        'min-h-screen': isEmbedded,
      })}
    >
      <Loader />
    </div>
  )
}
