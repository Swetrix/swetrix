import { useEffect } from 'react'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ExternalScriptsHandle } from 'remix-utils/external-scripts'

import { isSelfhosted } from '~/lib/constants'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const handle: ExternalScriptsHandle = {
  scripts: [
    {
      src: 'https://cdn.paddle.com/paddle/v2/paddle.js',
      preload: true, // use it to render a <link rel="preload"> for this script
    },
  ],
}

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
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
      <div className='mx-auto px-4 pt-12 pb-16 sm:px-6 md:w-4/5 lg:px-8'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50'>Swetrix Payment</h1>
      </div>
    </div>
  )
}
