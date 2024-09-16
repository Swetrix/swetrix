import React from 'react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'

const Circle = ({ size, delay, opacity }: { size: number; delay: number; opacity: string }) => {
  return (
    <motion.div
      variants={{
        idle: { width: `${size}px`, height: `${size}px` },
        active: {
          width: [`${size}px`, `${size + 10}px`, `${size}px`],
          height: [`${size}px`, `${size + 10}px`, `${size}px`],
          transition: {
            duration: 0.75,
            repeat: Infinity,
            repeatDelay: 1.25,
            ease: 'easeInOut',
            delay,
          },
        },
      }}
      style={{ '--opacity': opacity } as React.CSSProperties}
      className={clsx(
        'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full',
        'bg-[radial-gradient(circle,transparent_25%,color-mix(in_srgb,_theme(colors.blue.500)_var(--opacity),transparent)_100%)]',
        'ring-1 ring-inset ring-blue-500/[8%]',
      )}
    />
  )
}

const Circles = () => {
  return (
    <div className='absolute inset-0'>
      <Circle size={528} opacity='3%' delay={0.45} />
      <Circle size={400} opacity='5%' delay={0.3} />
      <Circle size={272} opacity='5%' delay={0.15} />
      <Circle size={144} opacity='10%' delay={0} />
      <div className='absolute inset-0 bg-gradient-to-t from-white to-35% group-data-[dark]:from-slate-800' />
    </div>
  )
}

const MainLogo = () => {
  return (
    <div className='absolute left-44 top-32 flex size-16 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/5'>
      <img src='/logo512.png' alt='' className='h-9 fill-black' />
    </div>
  )
}

const Logo = ({
  src,
  left,
  top,
  hover,
}: {
  src: string
  left: number
  top: number
  hover: { x: number; y: number; rotate: number; delay: number }
}) => {
  return (
    <motion.div
      variants={{
        idle: { x: 0, y: 0, rotate: 0 },
        active: {
          x: [0, hover.x, 0],
          y: [0, hover.y, 0],
          rotate: [0, hover.rotate, 0],
          transition: {
            duration: 0.75,
            repeat: Infinity,
            repeatDelay: 1.25,
            ease: 'easeInOut',
            delay: hover.delay,
          },
        },
      }}
      style={{ left, top } as React.CSSProperties}
      className='absolute flex size-16 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/5 group-data-[dark]:bg-slate-700/60'
    >
      <img src={src} alt='' className='size-10' />
    </motion.div>
  )
}

export const MarketplaceCluster = () => {
  return (
    <div aria-hidden='true' className='relative h-full overflow-hidden'>
      <Circles />
      <div className='absolute left-1/2 h-full w-[26rem] -translate-x-1/2'>
        <MainLogo />
        <Logo
          src='/assets/marketplace-extensions/json.png'
          left={360}
          top={144}
          hover={{ x: 6, y: 1, rotate: 5, delay: 0.38 }}
        />
        <Logo
          src='/assets/marketplace-extensions/tree.png'
          left={285}
          top={20}
          hover={{ x: 4, y: -5, rotate: 6, delay: 0.3 }}
        />
        <Logo
          src='/assets/marketplace-extensions/toml.png'
          left={255}
          top={210}
          hover={{ x: 3, y: 5, rotate: 7, delay: 0.2 }}
        />
        <Logo
          src='/assets/marketplace-extensions/xml.png'
          left={144}
          top={40}
          hover={{ x: -2, y: -5, rotate: -6, delay: 0.15 }}
        />
        <Logo
          src='/assets/marketplace-extensions/yaml.png'
          left={36}
          top={56}
          hover={{ x: -4, y: -5, rotate: -6, delay: 0.35 }}
        />
        {/* <Logo
          src='./logo-cluster/we-work-remotely.svg'
          left={96}
          top={176}
          hover={{ x: -3, y: 5, rotate: 3, delay: 0.15 }}
        /> */}
      </div>
    </div>
  )
}
