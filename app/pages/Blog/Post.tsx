import React from 'react'
import { Link, useLoaderData } from '@remix-run/react'
import NotFound from 'pages/NotFound'

interface IPost {
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
  const post = useLoaderData() as IPost

  if (!post) {
    return <NotFound />
  }

  return (
    <div className='bg-gray-50 text-gray-700 dark:bg-slate-900 dark:text-gray-300'>
      <div className=' mx-auto max-w-[52rem] px-4 pb-28 sm:px-6 md:px-8 lg:max-w-6xl xl:px-12'>
        <div className='overflow-hidden'>
          <div className='max-w-8xl mx-auto'>
            <div className='flex px-4 pb-10 pt-8 lg:px-8'>
              <Link
                to='/blog'
                className='group flex text-sm font-semibold leading-6 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white'
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
                Go back
              </Link>
            </div>
          </div>
          <div className='px-4 sm:px-6 md:px-8'>
            <div className='mx-auto max-w-3xl pb-28'>
              <main className='bg-gray-50 dark:bg-slate-900'>
                <article className='relative pt-10'>
                  <h1 className='text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 md:text-3xl '>
                    {post.title}
                  </h1>
                  <div className='text-sm leading-6'>
                    <dl>
                      <dt className='sr-only'>Date</dt>
                      <dd className='absolute inset-x-0 top-0 text-slate-700 dark:text-slate-400'>
                        <time dateTime={post.date}>{post.date}</time>
                      </dd>
                    </dl>
                  </div>
                  <div className='mt-6'>
                    <ul className='-mx-5 -mt-6 flex flex-wrap text-sm leading-6'>
                      <li className='mt-6 flex items-center whitespace-nowrap px-5 font-medium'>
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
                  <div className='single_post mt-6'>
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
