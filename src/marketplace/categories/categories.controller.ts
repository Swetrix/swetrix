import { Body, ConflictException, Controller, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'
import { CreateCategory } from './dtos/create-category.dto'

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async createCategory(@Body() body: CreateCategory): Promise<any> {
    const title = await this.categoriesService.findTitle(body.title)

    if (title) {
      throw new ConflictException('The category already exists.')
    }

    const categoryInstance = this.categoriesService.create(body)

    return await this.categoriesService.save(categoryInstance)
  }
}
