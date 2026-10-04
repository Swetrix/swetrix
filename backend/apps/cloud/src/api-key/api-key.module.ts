import { Global, Module, forwardRef } from '@nestjs/common'
import { UserModule } from '../user/user.module'
import { ApiKeyService } from './api-key.service'
import { ApiKeyStore } from './api-key.store'
import { ApiKeyController } from './api-key.controller'
import { ApiKeyGuard } from './api-key.guard'

@Global()
@Module({
  imports: [forwardRef(() => UserModule)],
  providers: [ApiKeyService, ApiKeyStore, ApiKeyGuard],
  controllers: [ApiKeyController],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
