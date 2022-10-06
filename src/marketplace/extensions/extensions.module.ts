import { UserModule } from 'src/user/user.module'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CategoriesModule } from '../categories/categories.module'
import { CdnModule } from '../cdn/cdn.module'
import { Extension } from './extension.entity'
import { InstallExtension } from './installExtension.entiy'
import { ExtensionsController } from './extensions.controller'
import { ExtensionsService } from './extensions.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Extension]),
    TypeOrmModule.forFeature([InstallExtension]),
    CategoriesModule,
    CdnModule,
    UserModule,
  ],
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
})
export class ExtensionsModule {}
