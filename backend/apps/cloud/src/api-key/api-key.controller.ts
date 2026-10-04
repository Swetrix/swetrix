import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { Auth } from '../auth/decorators'
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator'
import { ApiKeyService } from './api-key.service'
import { SaveApiKeyDto } from './api-key.dto'
import { checkRateLimit } from '../common/utils'

@Controller(['user/api-keys', 'v1/user/api-keys'])
@Auth()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class ApiKeyController {
  constructor(private readonly keys: ApiKeyService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(
    @CurrentUserId() userId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.keys.list(userId, projectId)
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  async create(@CurrentUserId() userId: string, @Body() dto: SaveApiKeyDto) {
    await checkRateLimit(userId, 'create-api-key', 20, 3600)
    return this.keys.create(userId, dto)
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: SaveApiKeyDto,
  ) {
    return this.keys.update(userId, id, dto)
  }

  @Post(':id/reveal')
  @Header('Cache-Control', 'no-store')
  async reveal(@CurrentUserId() userId: string, @Param('id') id: string) {
    await checkRateLimit(userId, 'reveal-api-key', 60, 3600)
    return this.keys.reveal(userId, id)
  }

  @Post(':id/rotate')
  @Header('Cache-Control', 'no-store')
  async rotate(@CurrentUserId() userId: string, @Param('id') id: string) {
    await checkRateLimit(userId, 'rotate-api-key', 20, 3600)
    return this.keys.rotate(userId, id)
  }

  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.keys.remove(userId, id)
  }
}
