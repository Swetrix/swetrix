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
      <div className='flex min-h-min-footer items-center justify-center'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-200'>No posts found</h1>
      </div>
    )
  }

  return (
    <div className='bg-gray-50 py-10 text-gray-700 dark:bg-slate-900 dark:text-gray-300'>
      <div className='mx-auto max-w-[52rem] px-4 pb-28 sm:px-6 md:px-8 lg:max-w-6xl xl:px-12'>
        <div className='relative mt-10 sm:ml-[calc(2rem+1px)] sm:pb-12 md:ml-[calc(3.5rem+1px)] lg:ml-[max(calc(14.5rem+1px),calc(100%-48rem))] '>
          <div className='absolute bottom-0 right-full top-3 mr-7 hidden w-px bg-slate-200 dark:bg-slate-700 sm:block md:mr-[3.25rem]'></div>

          <div className='space-y-16'>
            {_map(posts, (post) => {
              if (post.hidden) {
                return null
              }

              return (
                <article className='group relative' key={post.slug}>
                  <div className='absolute -inset-x-4 -inset-y-2.5 group-hover:bg-slate-50/70 dark:group-hover:bg-slate-800/50 sm:rounded-2xl md:-inset-x-6 md:-inset-y-4'></div>
                  <svg
                    viewBox='0 0 9 9'
                    className='absolute right-full top-2 mr-6 hidden h-[calc(0.5rem+1px)] w-[calc(0.5rem+1px)] overflow-visible text-slate-200 dark:text-slate-600 sm:block md:mr-12'
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
                    <h3 className='pt-8 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-200 lg:pt-0'>
                      {post.title}
                    </h3>
                    {post.intro && (
                      <div className='prose prose-slate mb-4 mt-2 line-clamp-2 prose-a:relative prose-a:z-10 dark:text-slate-400'>
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
                    className='flex items-center text-sm font-medium text-indigo-600 dark:text-gray-50'
                    to={post.slug}
                  >
                    <span className='absolute -inset-x-4 -inset-y-2.5 sm:rounded-2xl md:-inset-x-6 md:-inset-y-4'></span>
                    <span className='relative'>Read more</span>
                    <svg
                      className='relative ml-2.5 mt-px overflow-visible text-indigo-600 dark:text-gray-50'
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
