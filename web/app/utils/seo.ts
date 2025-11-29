import { TITLE_SUFFIX } from '~/lib/constants'

export const getTitle = (title: string) => [
  {
    title: `${title} ${TITLE_SUFFIX}`,
  },
  {
    property: 'og:title',
    content: `${title} ${TITLE_SUFFIX}`,
  },
  {
    name: 'twitter:title',
    content: `${title} ${TITLE_SUFFIX}`,
  },
]

export const getDescription = (description: string) => [
  {
    property: 'og:description',
    content: description,
  },
  {
    name: 'twitter:description',
    content: description,
  },
  {
    name: 'description',
    content: description,
  },
]

export const getPreviewImage = (imageUrl: string) => [
  {
    property: 'og:image',
    content: imageUrl,
  },
  {
    name: 'twitter:image',
    content: imageUrl,
  },
]
