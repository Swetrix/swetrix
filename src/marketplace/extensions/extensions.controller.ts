import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ApiParam, ApiTags } from '@nestjs/swagger'
import { AddExtension } from './dtos/add-extension.dto'
import { GetExtensionParams } from './dtos/get-extension-params.dto'
import { Extension } from './extension.entity'
import { ExtensionsService } from './extensions.service'
import { ISaveExtension } from './interfaces/save-extension.interface'

@ApiTags('extensions')
@UsePipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    whitelist: true,
  }),
)
@Controller('extensions')
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  @ApiParam({
    name: 'extensionId',
    description: 'Extension ID',
    example: '1',
    type: String,
  })
  @Get(':extensionId')
  async getExtension(@Param() params: GetExtensionParams): Promise<Extension> {
    const extension = await this.extensionsService.findById(params.extensionId)

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    return extension
  }

  @Post()
  async addExtension(
    @Body() body: AddExtension,
  ): Promise<ISaveExtension & Extension> {
    const title = await this.extensionsService.findTitle(body.title)

    if (title) {
      throw new ConflictException('The extension already exists.')
    }

    const extensionInstance = this.extensionsService.create(body)

    return await this.extensionsService.save(extensionInstance)
  }
}
