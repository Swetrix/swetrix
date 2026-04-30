import Spin from './icons/Spin'
import { cn } from '~/utils/generic'

interface LoaderProps {
  className?: string
  label?: string
}

const Loader = ({ className, label = 'Loading' }: LoaderProps) => (
  <div
    className={cn('flex items-center justify-center pt-10', className)}
    role='status'
    aria-live='polite'
  >
    <Spin className='mr-0! ml-0!' />
    <span className='sr-only'>{label}</span>
  </div>
)

export default Loader
