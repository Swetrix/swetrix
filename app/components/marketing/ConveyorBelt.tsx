import React from 'react'
import clsx from 'clsx'

const Logo = ({ label, className }: { label: string; className: string }) => {
  return (
    <div
      className={clsx(
        className,
        'absolute top-[calc(50%-1rem)] items-center gap-2 whitespace-nowrap px-3 py-1',
        'bg-gray-700 bg-gradient-to-t from-50% ring-1 ring-inset ring-white/10',
        '[animation-iteration-count:infinite] [animation-name:move-x] [animation-play-state:paused] [animation-timing-function:linear] group-hover:[animation-play-state:running]',
      )}
    >
      <span className='text-sm/6 font-medium text-white'>{label}</span>
    </div>
  )
}

export const ConveyorBelt = () => {
  return (
    <div aria-hidden='true' className='relative h-full overflow-hidden'>
      <div className='absolute inset-0 top-8 z-10 flex items-center justify-center'>
        <div
          className='absolute inset-0 backdrop-blur-md'
          style={{
            maskImage: `url('data:image/svg+xml,<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="96" height="96" rx="12" fill="black"/></svg>')`,
            maskPosition: 'center',
            maskRepeat: 'no-repeat',
          }}
        />
        <div className='relative flex size-24 items-center justify-center rounded-xl bg-gradient-to-t from-white/45 to-white/75 shadow outline outline-offset-[-5px] outline-white/5 ring-1 ring-inset ring-white/10 group-data-[dark]:from-slate-700/45 group-data-[dark]:to-slate-700/75'>
          <img src='/logo512.png' alt='' className='object-contain' />
        </div>
      </div>
      <div className='absolute inset-0 grid grid-cols-1 pt-8 [container-type:inline-size]'>
        <div className='group relative'>
          <div className='absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-black/15 from-[2px] to-[2px] bg-[length:12px_100%] group-data-[dark]:from-white/15' />
          <Logo
            label='Data'
            className='[--move-x-from:-100%] [--move-x-to:calc(100%+30cqw)] [animation-delay:-5s] [animation-duration:15s]'
          />
          <Logo
            label='Data'
            className='[--move-x-from:-100%] [--move-x-to:calc(100%+30cqw)] [animation-delay:-10s] [animation-duration:15s]'
          />
          <Logo
            label='Data'
            className='[--move-x-from:-100%] [--move-x-to:calc(100%+30cqw)] [animation-duration:15s]'
          />
          <Logo
            label='Sale'
            className='bg-green-700/70 [--move-x-from:calc(100%+32cqw)] [--move-x-to:calc(100%+100cqw)] [animation-duration:15s] dark:bg-green-700/60'
          />
          <Logo
            label='$$$'
            className='bg-green-700/70 [--move-x-from:calc(100%+32cqw)] [--move-x-to:calc(100%+100cqw)] [animation-delay:-5s] [animation-duration:15s] dark:bg-green-700/60'
          />
          <Logo
            label='Lead'
            className='bg-green-700/70 [--move-x-from:calc(100%+32cqw)] [--move-x-to:calc(100%+100cqw)] [animation-delay:-10s] [animation-duration:15s] dark:bg-green-700/60'
          />
        </div>
      </div>
    </div>
  )
}
