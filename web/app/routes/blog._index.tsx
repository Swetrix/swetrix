import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { CaretRightIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { redirect, Link, useLoaderData } from 'react-router'

import { getBlogPosts } from '~/api/api.server'
import { isDisableMarketingPages, isSelfhosted } from '~/lib/constants'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export async function loader({ request }: LoaderFunctionArgs) {
  if (isSelfhosted || isDisableMarketingPages) {
    return redirect('/dashboard', 302)
  }

  const data = await getBlogPosts(request)

  if (!data || _isEmpty(data)) {
    return null
  }

  return data
}

export const meta: MetaFunction = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { t } = useTranslation('common')

  return [
    ...getTitle('Blog'),
    ...getDescription(t('description.blog')),
    ...getPreviewImage(),
  ]
}

export default function Posts() {
  const posts: any[] = useLoaderData()

  if (_filter(posts, (post) => !post.hidden).length === 0) {
    return (
      <div className='flex min-h-min-footer items-center justify-center'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-200'>
          No posts found
        </h1>
      </div>
    )
  }

  return (
    <div className='bg-gray-50 py-10 text-gray-700 dark:bg-slate-950 dark:text-gray-300'>
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
                    <Link to={post.slug}>
                      <h3 className='pt-8 text-base font-semibold text-slate-900 lg:pt-0 dark:text-slate-200'>
                        {post.title}
                      </h3>
                    </Link>
                    {post.intro ? (
                      <div className='prose mt-2 mb-4 line-clamp-3 text-sm leading-7 prose-slate dark:text-slate-400'>
                        <p>{post.intro}</p>
                      </div>
                    ) : null}
                    <dl className='absolute top-0 left-0 font-mono text-sm font-medium tracking-wide uppercase lg:right-full lg:left-auto lg:mr-[calc(5rem+1px)]'>
                      <dt className='sr-only'>Date</dt>
                      <dd className='text-sm leading-6 whitespace-nowrap dark:text-slate-400'>
                        <time dateTime={post.date}>{post.date}</time>
                      </dd>
                    </dl>
                  </div>
                  <Link
                    className='underline-animate flex max-w-max items-center text-sm font-medium text-indigo-600 dark:text-gray-50'
                    to={post.slug}
                  >
                    <span className='relative'>Read more</span>
                    <CaretRightIcon className='relative mt-px ml-0.5 size-4 overflow-visible' />
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
