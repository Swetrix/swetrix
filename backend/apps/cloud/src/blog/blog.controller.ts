import { Controller, Param, Get, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiResponse } from '@nestjs/swagger'
import { BlogService } from './blog.service'

@ApiTags('Blog')
@Controller('v1/blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('/')
  @ApiResponse({ status: 200 })
  async getAll(): Promise<any> {
    return this.blogService.getAll()
  }

  @Get('/sitemap')
  @ApiResponse({ status: 200 })
  async getSitemap(): Promise<any> {
    return this.blogService.getSitemapFileNames(undefined, true)
  }

  @Get('/last-post')
  @ApiResponse({ status: 200 })
  async getLastPost(): Promise<any> {
    return this.blogService.getLastPost()
  }

  @Get('/:slug')
  @ApiResponse({ status: 200 })
  async getSlug(@Param('slug') slug: string): Promise<any> {
    const post = await this.blogService.getArticleBySlug(slug)

    if (!post) {
      throw new NotFoundException()
    }

    return post
  }

  @Get('/:category/:slug')
  @ApiResponse({ status: 200 })
  async getCategoryAlug(
    @Param('category') category: string,
    @Param('slug') slug: string,
  ): Promise<any> {
    const post = await this.blogService.getArticleBySlug(slug, category)

    if (!post) {
      throw new NotFoundException()
    }

    return post
  }
}
