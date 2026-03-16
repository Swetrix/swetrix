import { redirect } from 'react-router'
import { SitemapFunction } from 'remix-sitemap'

export const sitemap: SitemapFunction = () => ({
  exclude: true,
})

export const loader = async () => {
  return redirect('https://swetrix.com/projects/STEzHcB1rALV')
}
