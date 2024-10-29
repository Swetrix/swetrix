import { useEffect } from 'react'
import type { SitemapFunction } from 'remix-sitemap'
import { ExternalScriptsHandle } from 'remix-utils/external-scripts'

export const sitemap: SitemapFunction = () => ({
  priority: 0.9,
})

export let handle: ExternalScriptsHandle = {
  scripts: [
    {
      src: 'https://cdn.paddle.com/paddle/v2/paddle.js',
      preload: true, // use it to render a <link rel="preload"> for this script
    },
  ],
}

export default function Index() {
  useEffect(() => {
    if (!window.REMIX_ENV?.PADDLE_CLIENT_SIDE_TOKEN) {
      return
    }

    const initializePaddle = () => {
      if (window.Paddle) {
        window.Paddle.Initialize({
          token: window.REMIX_ENV?.PADDLE_CLIENT_SIDE_TOKEN,
        })
        return true
      }
      return false
    }

    const interval = setInterval(() => {
      if (initializePaddle()) {
        clearInterval(interval)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className='min-h-page bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto w-11/12 px-4 pb-16 pt-12 sm:px-6 md:w-4/5 lg:px-8'>
        <h1 className='text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50'>Swetrix Payment</h1>
      </div>
    </div>
  )
}
