import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import { ApiKeyStore } from './api-key.store'
import { ApiKeyRecord, API_KEY_SCOPES } from './api-key.types'
import { SaveApiKeyDto } from './api-key.dto'
import {
  decryptApiKey,
  encryptApiKey,
  generateApiKey,
  hashApiKey,
} from './api-key.crypto'

@Injectable()
export class ApiKeyService {
  constructor(readonly store: ApiKeyStore) {}

  async authenticate(secret: string) {
    if (typeof secret !== 'string' || secret.length > 100)
      throw new UnauthorizedException()
    const record = await this.store.findByHash(hashApiKey(secret))
    const user = record
      ? await this.store.userById(record.userId)
      : await this.store.legacyUser(secret)
    if (!user) throw new UnauthorizedException()
    return {
      ...user,
      apiKey: undefined,
      password: undefined,
      twoFactorAuthenticationSecret: undefined,
      twoFactorRecoveryCode: undefined,
      apiKeyAccess: record
        ? {
            id: record.id,
            scopes: record.scopes,
            projectIds: record.projectIds,
            allProjects: record.allProjects,
            unrestricted: record.unrestricted,
          }
        : {
            id: 'legacy',
            scopes: [],
            projectIds: [],
            allProjects: true,
            unrestricted: true,
          },
    }
  }

  async list(userId: string, projectId?: string) {
    const projects = await this.store.ownedProjects(userId)
    if (projectId && !projects.some((project) => project.id === projectId))
      throw new ForbiddenException()
    if (projectId) {
      const users = await this.store.projectUsers(projectId)
      const keys = (
        await Promise.all(
          users.map(async (owner) => {
            const records = await this.store.list(owner.id)
            if (owner.apiKey)
              records.unshift(this.legacyRecord(owner.id, owner.apiKey))
            return records
              .filter(
                (key) =>
                  key.unrestricted ||
                  (owner.id === userId &&
                    (key.allProjects || key.projectIds.includes(projectId))),
              )
              .map((key) => ({
                ...this.summary(key),
                id: `${owner.id}:${key.id}`,
                owner: owner.email,
                projectReadOnly: owner.id !== userId && !owner.canWrite,
              }))
          }),
        )
      ).flat()
      return {
        keys,
        projects: projects.filter((project) => project.id === projectId),
        scopes: API_KEY_SCOPES,
      }
    }
    const records = await this.store.list(userId)
    const user = await this.store.userById(userId)
    if (user?.apiKey) records.unshift(this.legacyRecord(userId, user.apiKey))
    return {
      keys: records
        .filter(
          (key) =>
            !projectId || key.allProjects || key.projectIds.includes(projectId),
        )
        .map((key) => this.summary(key)),
      projects,
      scopes: API_KEY_SCOPES,
    }
  }

  private legacyRecord(userId: string, secret: string): ApiKeyRecord {
    return {
      id: 'legacy',
      userId,
      name: 'API key',
      keyHash: '',
      encryptedKey: '',
      keyPreview: `••••${secret.slice(-4)}`,
      scopes: [],
      projectIds: [],
      allProjects: true,
      unrestricted: true,
      created: null,
      rotated: null,
    }
  }

  private summary(key: ApiKeyRecord) {
    const {
      keyHash: _keyHash,
      encryptedKey: _encryptedKey,
      userId: _userId,
      ...summary
    } = key
    return summary
  }

  async get(userId: string, id: string) {
    if (id === 'legacy') {
      const user = await this.store.userById(userId)
      if (user?.apiKey) return this.legacyRecord(userId, user.apiKey)
    } else {
      const key = await this.store.get(userId, id)
      if (key) return key
    }
    throw new NotFoundException('API key not found')
  }

  async reveal(userId: string, id: string) {
    const key = await this.get(userId, id)
    const secret =
      id === 'legacy'
        ? (await this.store.userById(userId)).apiKey
        : decryptApiKey(key.encryptedKey, userId, id)
    return { secret }
  }

  private async validate(userId: string, dto: SaveApiKeyDto) {
    if (!dto.name.trim())
      throw new BadRequestException('Enter a name for this key')
    if (!dto.scopes.length)
      throw new BadRequestException('Select at least one permission')
    if (!dto.allProjects && !dto.projectIds.length)
      throw new BadRequestException('Select at least one project')
    if (
      !dto.allProjects &&
      dto.scopes.some((scope) => scope.startsWith('organisations:'))
    )
      throw new BadRequestException(
        'Organisation permissions require all projects',
      )
    dto.scopes = [
      ...new Set(
        dto.scopes.flatMap((scope) =>
          scope.endsWith(':write')
            ? [scope, scope.replace(':write', ':read') as typeof scope]
            : [scope],
        ),
      ),
    ]
    const owned = await this.store.ownedProjects(userId)
    if (
      dto.projectIds.some((id) => !owned.some((project) => project.id === id))
    )
      throw new ForbiddenException(
        'You can only grant access to projects you own',
      )
  }

  private withSecret(record: ApiKeyRecord, secret: string): ApiKeyRecord {
    return {
      ...record,
      keyHash: hashApiKey(secret),
      encryptedKey: encryptApiKey(secret, record.userId, record.id),
      keyPreview: `${secret.startsWith('swx_') ? 'swx_' : ''}••••${secret.slice(-4)}`,
    }
  }

  async create(userId: string, dto: SaveApiKeyDto) {
    await this.validate(userId, dto)
    if ((await this.store.list(userId)).length >= 50)
      throw new BadRequestException('You can create up to 50 API keys')
    const secret = generateApiKey()
    const record = this.withSecret(
      {
        ...dto,
        name: dto.name.trim(),
        projectIds: dto.allProjects ? [] : dto.projectIds,
        id: randomUUID(),
        userId,
        unrestricted: false,
        created: new Date().toISOString(),
        rotated: null,
        keyHash: '',
        encryptedKey: '',
        keyPreview: '',
      },
      secret,
    )
    await this.store.insert(record)
    return { key: this.summary(record), secret }
  }

  async update(userId: string, id: string, dto: SaveApiKeyDto) {
    await this.validate(userId, dto)
    const old = await this.get(userId, id)
    const record = {
      ...old,
      ...dto,
      name: dto.name.trim(),
      projectIds: dto.allProjects ? [] : dto.projectIds,
      unrestricted: false,
    }
    if (id === 'legacy') {
      const { secret } = await this.reveal(userId, id)
      const migrated = this.withSecret({ ...record, id: randomUUID() }, secret)
      await this.store.replaceLegacy(migrated, secret)
      return this.summary(migrated)
    }
    await this.store.update(record, old.keyHash)
    return this.summary(record)
  }

  async rotate(userId: string, id: string) {
    const old = await this.get(userId, id)
    const secret = generateApiKey()
    const record = this.withSecret(
      {
        ...old,
        id: id === 'legacy' ? randomUUID() : id,
        rotated: new Date().toISOString(),
      },
      secret,
    )
    if (id === 'legacy') {
      const user = await this.store.userById(userId)
      await this.store.replaceLegacy(record, user.apiKey)
    } else {
      await this.store.update(record, old.keyHash)
    }
    return { key: this.summary(record), secret }
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id)
    if (id === 'legacy') await this.store.clearLegacy(userId)
    else await this.store.remove(userId, id)
  }
}
