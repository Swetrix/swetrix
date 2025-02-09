import type { LoaderFunction, MetaFunction } from 'react-router'
import { redirect, Link, useLoaderData } from 'react-router'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _filter from 'lodash/filter'
import { isDisableMarketingPages, isSelfhosted, TITLE_SUFFIX } from '~/lib/constants'
import { getBlogPosts } from '~/api'

export const loader: LoaderFunction = async () => {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/dashboard', 302)
  }

  const data = await getBlogPosts()
    .then((data) => {
      return data
    })
    .catch((error) => {
      console.error(error)
    })

  if (!data || _isEmpty(data)) {
    return null
  }

  return data
}

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
      <div className='min-h-min-footer flex items-center justify-center'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-200'>No posts found</h1>
      </div>
    )
  }

  return (
    <div className='bg-gray-50 py-10 text-gray-700 dark:bg-slate-900 dark:text-gray-300'>
      <div className='mx-auto max-w-[52rem] px-4 pb-28 sm:px-6 md:px-8 lg:max-w-6xl xl:px-12'>
        <div className='relative mt-10 sm:ml-[calc(2rem+1px)] sm:pb-12 md:ml-[calc(3.5rem+1px)] lg:ml-[max(calc(14.5rem+1px),calc(100%-48rem))]'>
          <div className='absolute top-3 right-full bottom-0 mr-7 hidden w-px bg-slate-200 sm:block md:mr-[3.25rem] dark:bg-slate-700'></div>

          <div className='space-y-16'>
            {_map(posts, (post) => {
              if (post.hidden) {
                return null
              }

              return (
                <article className='group relative' key={post.slug}>
                  <div className='absolute -inset-x-4 -inset-y-2.5 group-hover:bg-slate-50/70 sm:rounded-2xl md:-inset-x-6 md:-inset-y-4 dark:group-hover:bg-slate-800/50'></div>
                  <svg
                    viewBox='0 0 9 9'
                    className='absolute top-2 right-full mr-6 hidden h-[calc(0.5rem+1px)] w-[calc(0.5rem+1px)] overflow-visible text-slate-200 sm:block md:mr-12 dark:text-slate-600'
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
                    <h3 className='pt-8 text-base font-semibold tracking-tight text-slate-900 lg:pt-0 dark:text-slate-200'>
                      {post.title}
                    </h3>
                    {post.intro && (
                      <div className='prose prose-slate prose-a:relative prose-a:z-10 mt-2 mb-4 line-clamp-2 font-mono dark:text-slate-400'>
                        <p>{post.intro}</p>
                      </div>
                    )}
                    <dl className='absolute top-0 left-0 font-mono uppercase lg:right-full lg:left-auto lg:mr-[calc(5rem+1px)]'>
                      <dt className='sr-only'>Date</dt>
                      <dd className='text-sm leading-6 whitespace-nowrap dark:text-slate-400'>
                        <time dateTime={post.date}>{post.date}</time>
                      </dd>
                    </dl>
                  </div>
                  <Link
                    className='flex items-center font-mono text-sm font-medium text-indigo-600 dark:text-gray-50'
                    to={post.slug}
                  >
                    <span className='absolute -inset-x-4 -inset-y-2.5 sm:rounded-2xl md:-inset-x-6 md:-inset-y-4'></span>
                    <span className='relative'>Read more</span>
                    <svg
                      className='relative mt-px ml-2.5 overflow-visible text-indigo-600 dark:text-gray-50'
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
