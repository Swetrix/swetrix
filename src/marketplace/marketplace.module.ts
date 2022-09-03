import { Module } from '@nestjs/common'
import { CategoriesModule } from './categories/categories.module'
import { ExtensionsModule } from './extensions/extensions.module'
import { CdnModule } from './cdn/cdn.module'

@Module({
  imports: [CategoriesModule, ExtensionsModule, CdnModule],
})
export class MarketplaceModule {}
