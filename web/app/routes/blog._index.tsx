import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'
import { CaretRightIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { Link } from '~/ui/Link'
import { redirect, useLoaderData } from 'react-router'

import { getBlogPosts } from '~/api/api.server'
import {
  getOgImageUrl,
  isDisableMarketingPages,
  isSelfhosted,
} from '~/lib/constants'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'
import { Text } from '~/ui/Text'
import {
  blogBreadcrumbs,
  blogDateToIso,
  serializeBlogSchema,
} from '~/utils/blogMetadata'

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
    ...getDescription(t('blogPage.description')),
    ...getPreviewImage(
      getOgImageUrl('The Swetrix Blog', t('blogPage.description')),
    ),
  ]
}

export default function Posts() {
  const posts: any[] = useLoaderData() || []
  const { t } = useTranslation('common')
  const visiblePosts = posts.filter((post) => !post.hidden)

  return (
    <div className='bg-gray-50 py-10 text-gray-700 dark:bg-slate-950 dark:text-gray-300'>
      <div className='mx-auto max-w-[52rem] px-4 pb-28 sm:px-6 md:px-8 lg:max-w-6xl xl:px-12'>
        <header className='mx-auto max-w-3xl pt-6 pb-12 text-center sm:pt-10 sm:pb-16'>
          <nav
            aria-label={t('blogPage.breadcrumbLabel')}
            className='mb-8 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400'
          >
            <Link to='/' className='hover:text-slate-900 dark:hover:text-white'>
              {t('blogPage.home')}
            </Link>
            <CaretRightIcon className='size-3.5' aria-hidden='true' />
            <span aria-current='page'>{t('footer.blog')}</span>
          </nav>
          <Text
            as='h1'
            weight='bold'
            tracking='tight'
            className='text-4xl text-slate-900 sm:text-5xl dark:text-white'
          >
            {t('blogPage.title')} <span aria-hidden='true'>📚</span>
          </Text>
          <p className='mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 dark:text-slate-400'>
            {t('blogPage.description')}
          </p>
        </header>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: serializeBlogSchema([
              {
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                '@id': 'https://swetrix.com/blog#collection',
                url: 'https://swetrix.com/blog',
                name: t('blogPage.title'),
                description: t('blogPage.description'),
                mainEntity: {
                  '@type': 'ItemList',
                  itemListElement: visiblePosts.map((post, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: post.title,
                    url: `https://swetrix.com${post.standalone ? '/' : '/blog/'}${post.slug}`,
                  })),
                },
              },
              blogBreadcrumbs(),
            ]),
          }}
        />
        {visiblePosts.length === 0 && (
          <p className='text-center'>{t('blogPage.empty')}</p>
        )}

        <div className='relative sm:ml-[calc(2rem+1px)] sm:pb-12 md:ml-[calc(3.5rem+1px)] lg:ml-[max(calc(14.5rem+1px),calc(100%-48rem))]'>
          <div className='absolute top-3 right-full bottom-0 mr-7 hidden w-px bg-slate-200 sm:block md:mr-[3.25rem] dark:bg-slate-700'></div>

          <div className='space-y-16'>
            {_map(visiblePosts, (post) => {
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
                    <Link to={post.standalone ? `/${post.slug}` : post.slug}>
                      <Text
                        as='h2'
                        size='base'
                        weight='semibold'
                        className='pt-8 lg:pt-0'
                      >
                        {post.title}
                      </Text>
                    </Link>
                    {post.intro ? (
                      <div className='prose mt-2 mb-4 line-clamp-3 text-sm leading-7 prose-slate dark:text-slate-400'>
                        <p>{post.intro}</p>
                      </div>
                    ) : null}
                    <dl className='absolute top-0 left-0 font-mono text-sm font-medium tracking-wide uppercase lg:right-full lg:left-auto lg:mr-[calc(5rem+1px)]'>
                      <dt className='sr-only'>Date</dt>
                      <dd className='text-sm leading-6 whitespace-nowrap dark:text-slate-400'>
                        <time dateTime={blogDateToIso(post.date)}>
                          {post.date}
                        </time>
                      </dd>
                    </dl>
                  </div>
                  <Text as='p' size='sm'>
                    <Link
                      className='flex max-w-max items-center text-sm font-medium underline decoration-dashed hover:decoration-solid'
                      to={post.standalone ? `/${post.slug}` : post.slug}
                    >
                      <span className='relative'>Read more</span>
                      <CaretRightIcon className='relative mt-px ml-0.5 size-3 overflow-visible' />
                    </Link>
                  </Text>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
