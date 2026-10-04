import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ApiKeyService } from './api-key.service'
import { API_KEY_ACCESS, ApiKeyPolicy, ApiKeyPrincipal } from './api-key.types'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly keys: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest()
    const key: ApiKeyPrincipal | undefined = request.user?.apiKeyAccess
    if (!key || key.unrestricted) return true
    const policy = this.reflector.get<ApiKeyPolicy>(
      API_KEY_ACCESS,
      context.getHandler(),
    )
    if (
      !policy ||
      [policy.scope, ...(policy.requires || [])].some(
        (scope) => !key.scopes.includes(scope),
      )
    ) {
      throw new ForbiddenException(
        `This API key requires: ${policy ? [policy.scope, ...(policy.requires || [])].join(', ') : 'an explicit endpoint permission'}`,
      )
    }
    const query = request.query || {}
    if (query.type === 'errors' && !key.scopes.includes('errors:read'))
      throw new ForbiddenException('This API key requires errors:read')
    if (!key.scopes.includes('events:read') && request.method !== 'POST') {
      let filters = query.filters
      if (typeof filters === 'string') {
        try {
          filters = JSON.parse(filters)
        } catch {
          throw new ForbiddenException('Invalid filters')
        }
      }
      const eventDimension = (value: unknown) =>
        typeof value === 'string' &&
        (value === 'ev' ||
          value.startsWith('ev:') ||
          value === 'event' ||
          value === 'event_metadata')
      if (
        eventDimension(query.type) ||
        eventDimension(request.params?.dimension) ||
        (Array.isArray(filters) &&
          filters.some(
            (filter) =>
              eventDimension(filter?.column) ||
              eventDimension(filter?.dimension),
          ))
      ) {
        throw new ForbiddenException('This query requires events:read')
      }
    }
    if (policy.source === 'account' || policy.source === 'create') {
      if (!key.allProjects)
        throw new ForbiddenException(
          'This operation requires access to all projects',
        )
      return true
    }
    const owned = await this.keys.store.ownedProjects(request.user.id)
    const allowed = owned
      .filter(
        (project) => key.allProjects || key.projectIds.includes(project.id),
      )
      .map((project) => project.id)
    if (policy.source === 'list') {
      request.apiKeyProjectIds = allowed
      return true
    }
    let ids: unknown[]
    if (['goal', 'flag', 'export'].includes(policy.source)) {
      ids = [
        await this.keys.store.resourceProject(
          policy.source,
          request.params[policy.field],
        ),
      ]
    } else {
      const input = request[policy.source] || {}
      const value = input[policy.field]
      ids = value === undefined ? [] : [value]
      if (
        policy.source === 'query' &&
        policy.field === 'pid' &&
        input.pids !== undefined
      ) {
        let pids = input.pids
        if (typeof pids === 'string') {
          try {
            pids = JSON.parse(pids)
          } catch {
            throw new ForbiddenException('Invalid project IDs')
          }
        }
        if (!Array.isArray(pids))
          throw new ForbiddenException('Invalid project IDs')
        ids.push(...pids)
      }
    }
    if (
      !ids.length ||
      ids.some((id) => typeof id !== 'string' || !allowed.includes(id))
    ) {
      throw new ForbiddenException(
        'This API key does not have access to this project',
      )
    }
    return true
  }
}
