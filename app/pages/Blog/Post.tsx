import React from 'react'
import { Link, useLoaderData } from '@remix-run/react'
import NotFound from 'pages/NotFound'

export default function PostSlug() {
  const post = useLoaderData()

  if (!post) {
    return (
      <NotFound />
    )
  }

  return (
    <div className='bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300'>
      <div className=' max-w-[52rem] mx-auto px-4 pb-28 sm:px-6 md:px-8 xl:px-12 lg:max-w-6xl'>
        <div className='overflow-hidden'>
          <div className='max-w-8xl mx-auto'>
            <div className='flex px-4 pt-8 pb-10 lg:px-8'>
              <Link
                to='/blog'
                className='group flex font-semibold text-sm leading-6 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white'
              >
                <svg
                  viewBox='0 -9 3 24'
                  className='overflow-visible mr-3 text-slate-400 w-auto h-6 group-hover:text-slate-600 dark:group-hover:text-slate-300'
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
            <div className='max-w-3xl mx-auto pb-28'>
              <main className='bg-gray-50 dark:bg-slate-900'>
                <article className='relative pt-10'>
                  <h1 className='text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-200 md:text-3xl '>
                    {post.title}
                  </h1>
                  <div className='text-sm leading-6'>
                    <dl>
                      <dt className='sr-only'>Date</dt>
                      <dd className='absolute top-0 inset-x-0 text-slate-700 dark:text-slate-400'>
                        <time dateTime={post.date}>{post.date}</time>
                      </dd>
                    </dl>
                  </div>
                  <div className='mt-6'>
                    <ul className='flex flex-wrap text-sm leading-6 -mt-6 -mx-5'>
                      <li className='flex items-center font-medium whitespace-nowrap px-5 mt-6'>
                        <div className='text-sm leading-4'>
                          {post?.author && (
                            <div className='text-slate-900 dark:text-slate-200'>
                              {post.author}
                            </div>
                          )}
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
                  <div className='mt-6 single_post'>
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
