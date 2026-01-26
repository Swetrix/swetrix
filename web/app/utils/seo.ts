import { TITLE_SUFFIX } from '~/lib/constants'

export const getTitle = (title: string, showSuffix = true) => [
  {
    title: `${title} ${showSuffix ? TITLE_SUFFIX : ''}`.trim(),
  },
  {
    property: 'og:title',
    content: `${title} ${showSuffix ? TITLE_SUFFIX : ''}`.trim(),
  },
  {
    name: 'twitter:title',
    content: `${title} ${showSuffix ? TITLE_SUFFIX : ''}`.trim(),
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

export const getPreviewImage = (
  imageUrl = 'https://swetrix.com/assets/og_image.png?v=1',
) => [
  {
    property: 'og:image',
    content: imageUrl,
  },
  {
    name: 'twitter:image',
    content: imageUrl,
  },
]
