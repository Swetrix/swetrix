import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  blogArticleMeta,
  blogBreadcrumbs,
  blogDateToIso,
  blogImageUrl,
  blogPostSchema,
  serializeBlogSchema,
} from '../../app/utils/blogMetadata.ts'

test('converts existing written dates and preserves ISO calendar dates', () => {
  assert.equal(blogDateToIso('July 17, 2026'), '2026-07-17')
  assert.equal(blogDateToIso('September 24, 2026'), '2026-09-24')
  assert.equal(blogDateToIso('2024-02-29'), '2024-02-29')
  assert.equal(
    blogDateToIso('2026-09-24T12:00:00+01:00'),
    '2026-09-24T11:00:00.000Z',
  )
  assert.equal(
    blogDateToIso(new Date('2026-09-24T11:00:00Z')),
    '2026-09-24T11:00:00.000Z',
  )
})

test('omits invalid or ambiguous dates instead of rolling into another month', () => {
  for (const input of [
    'February 30, 2026',
    '2026-02-29',
    '2026-13-01',
    'Nope 2, 2026',
    '24/09/2026',
    '2026-09-24T12:00:00',
    undefined,
    '',
    new Date('invalid'),
  ]) {
    assert.equal(blogDateToIso(input), undefined)
  }
})

test('adds only supplied, valid image and modification metadata', () => {
  const post = {
    title: 'A useful article',
    date: 'July 17, 2026',
    author: 'Andrii Romasiun',
  }
  const fallbackImage =
    'https://swetrix.com/api/og-image.png?title=A%20useful%20article&description='
  const old = blogPostSchema(
    post,
    '/blog/article?utm_source=test',
    fallbackImage,
  )
  assert.equal(old.datePublished, '2026-07-17')
  assert.equal('dateModified' in old, false)
  assert.equal(old.image, fallbackImage)
  assert.equal(old.mainEntityOfPage['@id'], 'https://swetrix.com/blog/article')
  const updated = blogPostSchema(
    {
      ...post,
      modified: 'September 24, 2026',
      image: 'https://cdn.swetrix.com/file/cover.png',
    },
    '/blog/article',
    fallbackImage,
  )
  assert.equal(updated.dateModified, '2026-09-24')
  assert.equal(updated.image, 'https://cdn.swetrix.com/file/cover.png')
  assert.equal(
    'dateModified' in
      blogPostSchema(
        { ...post, modified: 'July 16, 2026' },
        '/blog/article',
        fallbackImage,
      ),
    false,
  )
  assert.equal(
    blogPostSchema(
      { ...post, image: 'javascript:alert(1)' },
      '/blog/article',
      fallbackImage,
    ).image,
    fallbackImage,
  )
  assert.equal(
    blogArticleMeta({ ...post, modified: 'September 24, 2026' }).find(
      (entry) => entry.property === 'article:modified_time',
    )?.content,
    '2026-09-24',
  )
})

test('rejects non-web image URLs and credentials', () => {
  for (const input of [
    'javascript:alert(1)',
    'data:image/png;base64,a',
    'ftp://example.com/image.png',
    '/relative.png',
    'https://user:secret@example.com/image.png',
    undefined,
  ]) {
    assert.equal(blogImageUrl(input), undefined)
  }
})

test('describes the blog hierarchy and safely serializes article titles', () => {
  const crumbs = blogBreadcrumbs(
    'Article',
    'https://swetrix.com/blog/article',
  ).itemListElement
  assert.deepEqual(
    crumbs.map((item) => item.position),
    [1, 2, 3],
  )
  assert.equal(crumbs[1].item, 'https://swetrix.com/blog')
  assert.equal(blogBreadcrumbs().itemListElement.length, 2)
  const encoded = serializeBlogSchema({
    headline: '</script><script>alert(1)</script>',
  })
  assert.equal(encoded.includes('<'), false)
  assert.equal(
    JSON.parse(encoded).headline,
    '</script><script>alert(1)</script>',
  )
})
