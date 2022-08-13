import { Module } from '@nestjs/common'
import { CategoriesModule } from './categories/categories.module'
import { ExtensionsModule } from './extensions/extensions.module'

@Module({
  imports: [CategoriesModule, ExtensionsModule],
})
export class MarketplaceModule {}
