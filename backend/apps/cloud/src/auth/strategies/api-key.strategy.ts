import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { HeaderAPIKeyStrategy } from 'passport-headerapikey'
import { ApiKeyService } from '../../api-key/api-key.service'

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-key',
) {
  constructor(private readonly keys: ApiKeyService) {
    super({ header: 'X-Api-Key', prefix: '' }, false)
  }

  validate(apiKey: string) {
    return this.keys.authenticate(apiKey)
  }
}
