import { CaretLeftIcon } from '@phosphor-icons/react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '~/ui/Link'
import { useLoaderData, useLocation } from 'react-router'

import ExitIntentPopup from '~/components/ExitIntentPopup'
import NotFound from '~/pages/NotFound'
import ArticleNav from '~/pages/Blog/ArticleNav'
import { Text } from '~/ui/Text'
import { getOgImageUrl } from '~/lib/constants'
import {
  blogBreadcrumbs,
  blogDateToIso,
  blogPostSchema,
  serializeBlogSchema,
  type BlogMetadata,
} from '~/utils/blogMetadata'
import type { ArticleHeading } from '~/utils/toc'

interface Post extends BlogMetadata {
  slug: string
  html: string
  hidden?: boolean
  headings: ArticleHeading[]
  seoTitle?: string
  seoDescription?: string
}

export default function PostSlug() {
  const location = useLocation()
  const post = useLoaderData() as Post
  const { t } = useTranslation('common')
  const articleRef = useRef<HTMLElement>(null)

  if (!post) {
    return <NotFound />
  }

  return (
    <div className='bg-gray-50 text-gray-700 dark:bg-slate-950 dark:text-gray-300'>
      <ExitIntentPopup isStandalone={post.standalone} />
      <div className='mx-auto max-w-[52rem] px-4 pb-28 sm:px-6 md:px-8 lg:max-w-6xl xl:px-12'>
        <div className='overflow-hidden'>
          <div className='mx-auto max-w-4xl'>
            <main className='bg-gray-50 dark:bg-slate-950'>
              {post.standalone ? (
                <div className='mt-10 mb-6' />
              ) : (
                <Link
                  to='/blog'
                  className='underline-animate group mt-10 mb-6 flex max-w-max items-center text-sm leading-6 font-semibold text-slate-700 uppercase hover:text-slate-900 dark:text-slate-200 dark:hover:text-white'
                >
                  <CaretLeftIcon className='mr-2 size-4 text-slate-500 dark:text-slate-400' />
                  {t('common.allPosts')}
                </Link>
              )}
              <article ref={articleRef} className='relative'>
                <div className='mb-2 font-mono text-sm leading-6 font-medium tracking-wide uppercase'>
                  <dl>
                    <dt className='sr-only'>Date</dt>
                    <dd className='text-slate-700 dark:text-slate-400'>
                      <time dateTime={blogDateToIso(post.date)}>
                        {post.date}
                      </time>
                    </dd>
                  </dl>
                </div>
                <Text
                  as='h1'
                  weight='bold'
                  tracking='tight'
                  className='inline-block max-w-3xl text-[2.5rem]/10 text-pretty max-lg:font-medium lg:text-6xl'
                >
                  {post.title}
                </Text>
                <div className='mt-6'>
                  <ul className='-mx-5 -mt-6 flex flex-wrap text-sm leading-6'>
                    <li className='mt-6 flex items-center gap-4 px-5 font-medium whitespace-nowrap'>
                      {post?.twitter_handle ? (
                        <img
                          className='size-12 rounded-full'
                          src={`/assets/blog-authors/${post.twitter_handle}.png`}
                          alt={post.author || ''}
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
                              className='underline decoration-dashed hover:decoration-solid'
                            >
                              @{post.twitter_handle}
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  </ul>
                </div>
                <div className='prose mt-6 max-w-4xl prose-slate dark:prose-invert prose-headings:scroll-mt-20'>
                  <div dangerouslySetInnerHTML={{ __html: post.html }} />
                </div>
              </article>
              {!post.standalone && (
                <ArticleNav articleRef={articleRef} headings={post.headings} />
              )}
              {post.title ? (
                <script
                  type='application/ld+json'
                  dangerouslySetInnerHTML={{
                    __html: serializeBlogSchema([
                      blogPostSchema(
                        post,
                        location.pathname,
                        getOgImageUrl(
                          post.seoTitle || post.title || 'Blog',
                          post.seoDescription ||
                            post.intro ||
                            t('description.blog'),
                        ),
                      ),
                      ...(!post.standalone
                        ? [
                            blogBreadcrumbs(
                              post.title,
                              `https://swetrix.com${location.pathname}`,
                            ),
                          ]
                        : []),
                    ]),
                  }}
                />
              ) : null}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
