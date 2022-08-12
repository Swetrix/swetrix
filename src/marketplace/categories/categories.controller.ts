import { Controller } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {}
