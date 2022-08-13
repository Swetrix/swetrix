import { Module } from '@nestjs/common'
import { CategoriesModule } from './categories/categories.module'

@Module({
  imports: [CategoriesModule],
})
export class MarketplaceModule {}
