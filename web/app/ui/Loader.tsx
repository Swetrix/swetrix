import Spin from './icons/Spin'
import { cn } from '~/utils/generic'

interface LoaderProps {
  className?: string
  label?: string
}

const Loader = ({ className, label = 'Loading' }: LoaderProps) => (
  <output
    className={cn('flex items-center justify-center pt-10', className)}
    aria-live='polite'
  >
    <Spin className='mr-0! ml-0!' />
    <span className='sr-only'>{label}</span>
  </output>
)

export default Loader
