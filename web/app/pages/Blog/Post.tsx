import { ChevronLeftIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLoaderData, useLocation } from 'react-router'

import ExitIntentPopup from '~/components/ExitIntentPopup'
import NotFound from '~/pages/NotFound'
import { trackPageview } from '~/utils/analytics'

interface Post {
  slug: string
  title?: string
  html: string
  hidden?: boolean
  standalone?: boolean
  intro?: string
  date?: string
  author?: string
  twitter_handle?: string
}

export default function PostSlug() {
  const location = useLocation()
  const post = useLoaderData() as Post
  const { t } = useTranslation('common')

  useEffect(() => {
    const meta = post?.author
      ? {
          author: post.author,
        }
      : undefined

    trackPageview({
      payload: {
        pg: location.pathname,
        meta,
      },
    })
  }, [post, location])

  if (!post) {
    return <NotFound />
  }

  return (
    <div className='bg-gray-50 text-gray-700 dark:bg-slate-900 dark:text-gray-300'>
      <ExitIntentPopup isStandalone={post.standalone} />
      <div className='mx-auto max-w-[52rem] px-4 pb-28 sm:px-6 md:px-8 lg:max-w-6xl xl:px-12'>
        <div className='overflow-hidden'>
          <div className='mx-auto max-w-4xl'>
            <main className='bg-gray-50 dark:bg-slate-900'>
              {post.standalone ? (
                <div className='mt-10 mb-6' />
              ) : (
                <Link
                  to='/blog'
                  className='underline-animate group mt-10 mb-6 flex max-w-max items-center text-sm leading-6 font-semibold text-slate-700 uppercase hover:text-slate-900 dark:text-slate-200 dark:hover:text-white'
                >
                  <ChevronLeftIcon className='mr-2 size-4 text-slate-500 dark:text-slate-400' />
                  {t('common.allPosts')}
                </Link>
              )}
              <article className='relative'>
                <div className='mb-2 font-mono text-sm leading-6 font-medium tracking-wide uppercase'>
                  <dl>
                    <dt className='sr-only'>Date</dt>
                    <dd className='text-slate-700 dark:text-slate-400'>
                      <time dateTime={post.date}>{post.date}</time>
                    </dd>
                  </dl>
                </div>
                <h1 className='inline-block max-w-3xl text-[2.5rem]/10 tracking-tight text-pretty text-gray-950 max-lg:font-medium lg:text-6xl dark:text-gray-200'>
                  {post.title}
                </h1>
                <div className='mt-6'>
                  <ul className='-mx-5 -mt-6 flex flex-wrap text-sm leading-6'>
                    <li className='mt-6 flex items-center gap-4 px-5 font-medium whitespace-nowrap'>
                      {post?.twitter_handle ? (
                        <img
                          className='size-12 rounded-full'
                          src={`/assets/blog-authors/${post.twitter_handle}.png`}
                          alt=''
                        />
                      ) : null}
                      <div className='flex flex-col gap-0.5 text-sm leading-4'>
                        {post?.author ? (
                          <div className='font-semibold text-slate-900 dark:text-slate-200'>
                            {post.author}
                          </div>
                        ) : null}
                        {post?.twitter_handle ? (
                          <div className='mt-1'>
                            <a
                              href={`https://x.com/${post.twitter_handle}`}
                              className='text-indigo-600 hover:underline dark:text-indigo-400'
                            >
                              @{post.twitter_handle}
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  </ul>
                </div>
                <div className='prose mt-6 max-w-4xl prose-slate dark:prose-invert'>
                  <div dangerouslySetInnerHTML={{ __html: post.html }} />
                </div>
              </article>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
