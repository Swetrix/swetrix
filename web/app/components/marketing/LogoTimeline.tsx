import React from 'react'
import clsx from 'clsx'
import {
  SiFramer,
  SiGhost,
  SiGoogletagmanager,
  SiNextdotjs,
  SiNodedotjs,
  SiReact,
  SiSlack,
  SiSvelte,
  SiVuedotjs,
  SiWebflow,
  SiWix,
  SiWordpress,
} from '@icons-pack/react-simple-icons'

const Row = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className='group relative'>
      <div className='absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-black/15 from-[2px] to-[2px] bg-[length:12px_100%] group-data-[dark]:from-white/15' />
      <div className='absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-black/5 from-[2px] to-[2px] bg-[length:12px_100%] group-last:hidden group-data-[dark]:from-white/5' />
      {children}
    </div>
  )
}

const Logo = ({ label, icon, className }: { label: string; icon: React.ReactNode; className: string }) => {
  return (
    <div
      className={clsx(
        className,
        'absolute top-2 grid grid-cols-[1rem,1fr] items-center gap-2 whitespace-nowrap px-3 py-1',
        'rounded-full bg-gradient-to-t from-gray-800 from-50% to-gray-700 ring-1 ring-inset ring-white/10',
        '[--move-x-from:-100%] [--move-x-to:calc(100%+100cqw)] [animation-iteration-count:infinite] [animation-name:move-x] [animation-play-state:paused] [animation-timing-function:linear] group-hover:[animation-play-state:running]',
      )}
    >
      {icon}
      <span className='text-sm/6 font-medium text-white'>{label}</span>
    </div>
  )
}

export const LogoTimeline = () => {
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
        <div className='relative flex size-24 items-center justify-center rounded-xl bg-gradient-to-t from-white/5 to-white/25 shadow outline outline-offset-[-5px] outline-white/5 ring-1 ring-inset ring-white/10 group-data-[dark]:from-slate-700/5 group-data-[dark]:to-slate-700/25'>
          <img src='/logo512.png' alt='' className='object-contain' />
        </div>
      </div>
      <div className='absolute inset-0 grid grid-cols-1 pt-8 [container-type:inline-size]'>
        <Row>
          <Logo
            label='React'
            icon={<SiReact color='#61DAFB' size={16} />}
            className='[animation-delay:-26s] [animation-duration:30s]'
          />
          <Logo
            label='Vue'
            icon={<SiVuedotjs color='#4FC08D' size={16} />}
            className='[animation-delay:-8s] [animation-duration:30s]'
          />
        </Row>
        <Row>
          <Logo
            label='Webflow'
            icon={<SiWebflow color='#146EF5' size={16} />}
            className='[animation-delay:-40s] [animation-duration:40s]'
          />
          <Logo
            label='Ghost'
            icon={<SiGhost color='#FFFFFF' size={16} />}
            className='[animation-delay:-20s] [animation-duration:40s]'
          />
        </Row>
        <Row>
          <Logo
            label='Framer'
            icon={<SiFramer color='#0055FF' size={16} />}
            className='[animation-delay:-10s] [animation-duration:40s]'
          />
          <Logo
            label='WordPress'
            icon={<SiWordpress color='#21759B' size={16} />}
            className='[animation-delay:-32s] [animation-duration:40s]'
          />
        </Row>
        <Row>
          <Logo
            label='Wix'
            icon={<SiWix color='#0C6EFC' size={16} />}
            className='[animation-delay:-45s] [animation-duration:45s]'
          />
          <Logo
            label='Google Tag Manager'
            icon={<SiGoogletagmanager color='#246FDB' size={16} />}
            className='[animation-delay:-23s] [animation-duration:45s]'
          />
        </Row>
        <Row>
          <Logo
            label='Svelte'
            icon={<SiSvelte color='#FF3E00' size={16} />}
            className='[animation-delay:-55s] [animation-duration:60s]'
          />
          <Logo
            label='Node.js'
            icon={<SiNodedotjs color='#5FA04E' size={16} />}
            className='[animation-delay:-20s] [animation-duration:60s]'
          />
        </Row>
        <Row>
          <Logo
            label='Next.js'
            icon={<SiNextdotjs color='#FFFFFF' size={16} />}
            className='[animation-delay:-9s] [animation-duration:40s]'
          />
          <Logo
            label='Slack'
            icon={<SiSlack color='#7C3085' size={16} />}
            className='[animation-delay:-28s] [animation-duration:40s]'
          />
        </Row>
      </div>
    </div>
  )
}
