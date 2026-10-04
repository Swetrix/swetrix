import { ConflictException, Injectable } from '@nestjs/common'
import { clickhouse } from '../common/integrations/clickhouse'
import { redis } from '../common/constants'
import { UserService } from '../user/user.service'
import { ApiKeyRecord } from './api-key.types'

const decode = (row: any): ApiKeyRecord =>
  row && {
    ...row,
    scopes: JSON.parse(row.scopes),
    projectIds: JSON.parse(row.projectIds),
    allProjects: Boolean(row.allProjects),
    unrestricted: Boolean(row.unrestricted),
  }
const encode = (key: ApiKeyRecord) => ({
  ...key,
  scopes: JSON.stringify(key.scopes),
  projectIds: JSON.stringify(key.projectIds),
  allProjects: Number(key.allProjects),
  unrestricted: Number(key.unrestricted),
})

@Injectable()
export class ApiKeyStore {
  constructor(private readonly users: UserService) {}
  private async query(query: string, query_params: Record<string, unknown>) {
    return (await (await clickhouse.query({ query, query_params })).json<any>())
      .data
  }
  async list(userId: string): Promise<ApiKeyRecord[]> {
    return (
      await this.query(
        'SELECT * FROM api_key WHERE userId = {userId:String} ORDER BY created DESC',
        { userId },
      )
    ).map(decode)
  }
  async get(userId: string, id: string) {
    return decode(
      (
        await this.query(
          'SELECT * FROM api_key WHERE userId = {userId:String} AND id = {id:String}',
          { userId, id },
        )
      )[0],
    )
  }
  async findByHash(keyHash: string) {
    return decode(
      (
        await this.query(
          'SELECT * FROM api_key WHERE keyHash = {keyHash:String}',
          { keyHash },
        )
      )[0],
    )
  }
  async insert(key: ApiKeyRecord) {
    await clickhouse.insert({
      table: 'api_key',
      format: 'JSONEachRow',
      values: [encode(key)],
      clickhouse_settings: { async_insert: 0, wait_for_async_insert: 1 },
    })
  }
  async update(key: ApiKeyRecord, expectedHash: string) {
    await clickhouse.command({
      query:
        'ALTER TABLE api_key UPDATE name = {name:String}, keyHash = {keyHash:String}, encryptedKey = {encryptedKey:String}, keyPreview = {keyPreview:String}, scopes = {scopes:String}, projectIds = {projectIds:String}, allProjects = {allProjects:UInt8}, unrestricted = {unrestricted:UInt8}, rotated = {rotated:Nullable(String)} WHERE id = {id:String} AND userId = {userId:String} AND keyHash = {expectedHash:String}',
      query_params: { ...encode(key), expectedHash },
      clickhouse_settings: { mutations_sync: '2' },
    })
    if ((await this.get(key.userId, key.id))?.keyHash !== key.keyHash)
      throw new ConflictException(
        'This key has changed. Refresh and try again.',
      )
  }
  async remove(userId: string, id: string) {
    await clickhouse.command({
      query:
        'ALTER TABLE api_key DELETE WHERE userId = {userId:String} AND id = {id:String}',
      query_params: { userId, id },
      clickhouse_settings: { mutations_sync: '2' },
    })
  }
  userById(id: string) {
    return this.users.findOne({ id })
  }
  legacyUser(apiKey: string) {
    return this.users.findOne({ apiKey })
  }
  async clearLegacy(userId: string) {
    await clickhouse.command({
      query: 'ALTER TABLE user UPDATE apiKey = NULL WHERE id = {userId:String}',
      query_params: { userId },
      clickhouse_settings: { mutations_sync: '2' },
    })
  }
  async replaceLegacy(key: ApiKeyRecord, previous: string) {
    const lock = `api-key:legacy:${key.userId}`
    const acquired = await redis.set(lock, key.id, 'EX', 300, 'NX')
    if (!acquired)
      throw new ConflictException('This key is being changed. Try again.')
    try {
      if ((await this.userById(key.userId))?.apiKey !== previous)
        throw new ConflictException(
          'This key has changed. Refresh and try again.',
        )
      await this.insert(key)
      try {
        await this.clearLegacy(key.userId)
      } catch (error) {
        await this.remove(key.userId, key.id)
        throw error
      }
    } finally {
      await redis.eval(
        'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) end',
        1,
        lock,
        key.id,
      )
    }
  }
  async ownedProjects(userId: string): Promise<{ id: string; name: string }[]> {
    return this.query(
      'SELECT id, name FROM project WHERE adminId = {userId:String} ORDER BY name',
      { userId },
    )
  }
  async projectUsers(
    projectId: string,
  ): Promise<
    { id: string; email: string; apiKey: string | null; canWrite?: number }[]
  > {
    return this.query(
      `SELECT id, email, apiKey,
      (id IN (SELECT adminId FROM project WHERE id = {projectId:String}) OR id IN (SELECT userId FROM project_share WHERE projectId = {projectId:String} AND confirmed = 1 AND role = 'admin')) AS canWrite
      FROM user WHERE id IN (
      SELECT adminId FROM project WHERE id = {projectId:String}
      UNION DISTINCT SELECT userId FROM project_share WHERE projectId = {projectId:String} AND confirmed = 1
    )`,
      { projectId },
    )
  }
  async resourceProject(kind: string, id: string): Promise<string | undefined> {
    if (kind === 'export') {
      const raw = await redis.get(`session-replay:export:${id}`)
      return raw ? JSON.parse(raw).pid : undefined
    }
    const table =
      kind === 'goal' ? 'goal' : kind === 'flag' ? 'feature_flag' : null
    if (!table) return undefined
    return (
      await this.query(
        `SELECT projectId FROM ${table} WHERE id = {id:String}`,
        { id },
      )
    )[0]?.projectId
  }
}
