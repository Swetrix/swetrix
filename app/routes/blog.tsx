import type { MetaFunction } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { blogLoader } from 'utils/getPosts'
import _map from 'lodash/map'
import _filter from 'lodash/filter'
import { TITLE_SUFFIX } from 'redux/constants'

export const loader = blogLoader

export const meta: MetaFunction = () => {
  return [
    {
      title: `Blog ${TITLE_SUFFIX}`,
    },
    {
      property: 'og:title',
      content: `Blog ${TITLE_SUFFIX}`,
    },
    {
      property: 'twitter:title',
      content: `Blog ${TITLE_SUFFIX}`,
    },
  ]
}

export default function Posts() {
  const posts: any[] = useLoaderData()

  if (_filter(posts, (post) => !post.hidden).length === 0) {
    return (
      <div className='flex justify-center items-center min-h-min-footer'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-200'>No posts found</h1>
      </div>
    )
  }

  return (
    <div className='bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 py-10'>
      <div className='max-w-[52rem] mx-auto px-4 pb-28 sm:px-6 md:px-8 xl:px-12 lg:max-w-6xl'>
        <div className='relative sm:pb-12 sm:ml-[calc(2rem+1px)] md:ml-[calc(3.5rem+1px)] lg:ml-[max(calc(14.5rem+1px),calc(100%-48rem))] mt-10 '>
          <div className='hidden absolute top-3 bottom-0 right-full mr-7 md:mr-[3.25rem] w-px bg-slate-200 dark:bg-slate-700 sm:block'></div>

          <div className='space-y-16'>
            {_map(posts, (post) => {
              if (post.hidden) {
                return null
              }

              return (
                <article className='relative group' key={post.slug}>
                  <div className='absolute -inset-y-2.5 -inset-x-4 md:-inset-y-4 md:-inset-x-6 sm:rounded-2xl group-hover:bg-slate-50/70 dark:group-hover:bg-slate-800/50'></div>
                  <svg
                    viewBox='0 0 9 9'
                    className='hidden absolute right-full mr-6 top-2 text-slate-200 dark:text-slate-600 md:mr-12 w-[calc(0.5rem+1px)] h-[calc(0.5rem+1px)] overflow-visible sm:block'
                  >
                    <circle
                      cx='4.5'
                      cy='4.5'
                      r='4.5'
                      stroke='currentColor'
                      className='fill-white dark:fill-slate-800'
                      strokeWidth='2'
                    />
                  </svg>
                  <div className='relative'>
                    <h3 className='text-base font-semibold tracking-tight text-slate-900 dark:text-slate-200 pt-8 lg:pt-0'>
                      {post.title}
                    </h3>
                    {post.intro && (
                      <div className='mt-2 mb-4 prose prose-slate prose-a:relative prose-a:z-10 dark:text-slate-400 line-clamp-2'>
                        <p>{post.intro}</p>
                      </div>
                    )}
                    <dl className='absolute left-0 top-0 lg:left-auto lg:right-full lg:mr-[calc(5rem+1px)]'>
                      <dt className='sr-only'>Date</dt>
                      <dd className='whitespace-nowrap text-sm leading-6 dark:text-slate-400'>
                        <time dateTime={post.date}>{post.date}</time>
                      </dd>
                    </dl>
                  </div>
                  <Link
                    className='flex items-center text-sm text-indigo-600 dark:text-gray-50 font-medium'
                    to={post.slug}
                  >
                    <span className='absolute -inset-y-2.5 -inset-x-4 md:-inset-y-4 md:-inset-x-6 sm:rounded-2xl'></span>
                    <span className='relative'>Read more</span>
                    <svg
                      className='relative mt-px overflow-visible ml-2.5 text-indigo-600 dark:text-gray-50'
                      width='3'
                      height='6'
                      viewBox='0 0 3 6'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    >
                      <path d='M0 0L3 3L0 6' />
                    </svg>
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
