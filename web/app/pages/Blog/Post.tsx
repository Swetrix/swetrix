import React, { useEffect } from 'react'
import { Link, useLoaderData, useLocation } from '@remix-run/react'
import NotFound from '~/pages/NotFound'
import { trackPageview } from '~/utils/analytics'
import { useTranslation } from 'react-i18next'

interface Post {
  slug: string
  title?: string
  html: string
  hidden?: boolean
  intro?: string
  date?: string
  author?: string
  nickname?: string
}

export default function PostSlug() {
  const location = useLocation()
  const post = useLoaderData() as Post
  const { t } = useTranslation('common')

  useEffect(() => {
    const meta = post.author
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
      <div className='mx-auto max-w-[52rem] px-4 pb-28 sm:px-6 md:px-8 lg:max-w-6xl xl:px-12'>
        <div className='overflow-hidden'>
          <div className='px-4 sm:px-6 md:px-8'>
            <div className='mx-auto max-w-3xl pb-28'>
              <main className='bg-gray-50 dark:bg-slate-900'>
                <Link
                  to='/blog'
                  className='group mt-10 mb-6 flex font-mono text-sm leading-6 font-semibold text-slate-700 uppercase hover:text-slate-900 dark:text-slate-200 dark:hover:text-white'
                >
                  <svg
                    viewBox='0 -9 3 24'
                    className='mr-3 h-6 w-auto overflow-visible text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  >
                    <path
                      d='M3 0L0 3L3 6'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                  {t('common.goBack')}
                </Link>
                <article className='relative'>
                  <div className='mb-2 font-mono text-sm leading-6 uppercase'>
                    <dl>
                      <dt className='sr-only'>Date</dt>
                      <dd className='text-slate-700 dark:text-slate-400'>
                        <time dateTime={post.date}>{post.date}</time>
                      </dd>
                    </dl>
                  </div>
                  <h1 className='text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl dark:text-slate-200'>
                    {post.title}
                  </h1>
                  <div className='mt-6'>
                    <ul className='-mx-5 -mt-6 flex flex-wrap text-sm leading-6'>
                      <li className='mt-6 flex items-center px-5 font-medium whitespace-nowrap'>
                        <div className='text-sm leading-4'>
                          {post?.author && <div className='text-slate-900 dark:text-slate-200'>{post.author}</div>}
                          {post?.nickname && (
                            <div className='mt-1'>
                              <a
                                href={`https://github.com/${post.nickname}`}
                                className='text-indigo-600 dark:text-indigo-400'
                              >
                                @{post.nickname}
                              </a>
                            </div>
                          )}
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div className='prose prose-slate mt-6'>
                    <div dangerouslySetInnerHTML={{ __html: post.html }} />
                  </div>
                </article>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
