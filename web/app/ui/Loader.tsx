import Spin from './icons/Spin'
import { cn } from '~/utils/generic'

const Loader = ({ className }: { className?: string }) => (
  <div className={cn('flex justify-center pt-10', className)}>
    <Spin />
    <span className='sr-only'>Loading...</span>
  </div>
)

export default Loader
