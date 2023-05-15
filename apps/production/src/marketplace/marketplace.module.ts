import { Module } from '@nestjs/common'
import { CategoriesModule } from './categories/categories.module'
import { ExtensionsModule } from './extensions/extensions.module'
import { CdnModule } from './cdn/cdn.module'
import { CommentsModule } from './comments/comments.module'
import { ComplaintsModule } from './complaints/complaints.module'

@Module({
  imports: [
    CategoriesModule,
    ExtensionsModule,
    CdnModule,
    CommentsModule,
    ComplaintsModule,
  ],
})
export class MarketplaceModule {}
