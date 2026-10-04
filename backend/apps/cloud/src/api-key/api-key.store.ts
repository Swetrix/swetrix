import { ConflictException, Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { User } from '../user/entities/user.entity'
import { redis } from '../common/constants'
import { ApiKeyRecord } from './api-key.types'

const decode = (row: any): ApiKeyRecord =>
  row && {
    ...row,
    scopes:
      typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes,
    projectIds:
      typeof row.projectIds === 'string'
        ? JSON.parse(row.projectIds)
        : row.projectIds,
    allProjects: Boolean(row.allProjects),
    unrestricted: Boolean(row.unrestricted),
  }
const values = (key: ApiKeyRecord) => [
  key.name,
  key.keyHash,
  key.encryptedKey,
  key.keyPreview,
  JSON.stringify(key.scopes),
  JSON.stringify(key.projectIds),
  key.allProjects,
  key.unrestricted,
  key.created,
  key.rotated,
]

@Injectable()
export class ApiKeyStore {
  constructor(private readonly db: DataSource) {}
  async list(userId: string) {
    return (
      await this.db.query(
        'SELECT * FROM api_key WHERE userId = ? ORDER BY created DESC',
        [userId],
      )
    ).map(decode)
  }
  async get(userId: string, id: string) {
    return decode(
      (
        await this.db.query(
          'SELECT * FROM api_key WHERE userId = ? AND id = ?',
          [userId, id],
        )
      )[0],
    )
  }
  async findByHash(hash: string) {
    return decode(
      (
        await this.db.query('SELECT * FROM api_key WHERE keyHash = ?', [hash])
      )[0],
    )
  }
  async insert(key: ApiKeyRecord) {
    await this.db.query(
      'INSERT INTO api_key (name, keyHash, encryptedKey, keyPreview, scopes, projectIds, allProjects, unrestricted, created, rotated, id, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [...values(key), key.id, key.userId],
    )
  }
  async update(key: ApiKeyRecord, expectedHash: string) {
    const result = await this.db.query(
      'UPDATE api_key SET name = ?, keyHash = ?, encryptedKey = ?, keyPreview = ?, scopes = ?, projectIds = ?, allProjects = ?, unrestricted = ?, created = ?, rotated = ? WHERE id = ? AND userId = ? AND keyHash = ?',
      [...values(key), key.id, key.userId, expectedHash],
    )
    if (!result.affectedRows)
      throw new ConflictException(
        'This key has changed. Refresh and try again.',
      )
  }
  async remove(userId: string, id: string) {
    await this.db.query('DELETE FROM api_key WHERE userId = ? AND id = ?', [
      userId,
      id,
    ])
  }
  userById(id: string) {
    return this.db
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.apiKey')
      .where('user.id = :id', { id })
      .getOne()
  }
  legacyUser(apiKey: string) {
    return this.db.getRepository(User).findOne({ where: { apiKey } })
  }
  async clearLegacy(userId: string) {
    await this.db.query('UPDATE user SET apiKey = NULL WHERE id = ?', [userId])
  }
  async replaceLegacy(key: ApiKeyRecord, previous: string) {
    await this.db.transaction(async (manager) => {
      const result = await manager.query(
        'UPDATE user SET apiKey = NULL WHERE id = ? AND apiKey = ?',
        [key.userId, previous],
      )
      if (!result.affectedRows)
        throw new ConflictException(
          'This key has changed. Refresh and try again.',
        )
      await manager.query(
        'INSERT INTO api_key (name, keyHash, encryptedKey, keyPreview, scopes, projectIds, allProjects, unrestricted, created, rotated, id, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [...values(key), key.id, key.userId],
      )
    })
  }
  async ownedProjects(userId: string): Promise<{ id: string; name: string }[]> {
    return this.db.query(
      'SELECT id, name FROM project WHERE adminId = ? ORDER BY name',
      [userId],
    )
  }
  async projectUsers(
    projectId: string,
  ): Promise<
    { id: string; email: string; apiKey: string | null; canWrite?: number }[]
  > {
    return this.db.query(
      `SELECT DISTINCT u.id, u.email, u.apiKey,
        (u.id = p.adminId
          OR EXISTS (SELECT 1 FROM project_share ps WHERE ps.projectId = p.id AND ps.userId = u.id AND ps.confirmed = true AND ps.role = 'admin')
          OR EXISTS (SELECT 1 FROM organisation_member om WHERE om.organisationId = p.organisationId AND om.userId = u.id AND om.confirmed = true AND om.role IN ('owner', 'admin'))) AS canWrite
        FROM user u
      JOIN project p ON p.id = ?
      WHERE u.id = p.adminId
        OR EXISTS (SELECT 1 FROM project_share ps WHERE ps.projectId = p.id AND ps.userId = u.id AND ps.confirmed = true)
        OR EXISTS (SELECT 1 FROM organisation_member om WHERE om.organisationId = p.organisationId AND om.userId = u.id AND om.confirmed = true)`,
      [projectId],
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
      await this.db.query(`SELECT projectId FROM ${table} WHERE id = ?`, [id])
    )[0]?.projectId
  }
}
