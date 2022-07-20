import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActionTokensService } from './action-tokens.service';
import { ActionToken } from './action-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActionToken])],
  providers: [ActionTokensService],
  exports: [ActionTokensService],
})
export class ActionTokensModule {}
