import { SetMetadata } from '@nestjs/common'
import { API_KEY_ACCESS, ApiKeyPolicy, ApiKeyScope } from './api-key.types'

export const ApiKeyAccess = (
  scope: ApiKeyScope,
  source: ApiKeyPolicy['source'],
  field = 'pid',
  requires: ApiKeyScope[] = [],
) =>
  SetMetadata(API_KEY_ACCESS, {
    scope,
    source,
    field,
    requires,
  } satisfies ApiKeyPolicy)
