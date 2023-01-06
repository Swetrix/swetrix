import {
  Controller,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { I18nValidationExceptionFilter } from 'nestjs-i18n'

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
@UseFilters(new I18nValidationExceptionFilter())
@UsePipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    whitelist: true,
  }),
)
export class AuthController {}
