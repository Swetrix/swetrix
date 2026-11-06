import { ApiKeyPrincipal } from '../api-key/api-key.types'
import { clickhouse } from '../common/integrations/clickhouse'
import { Pagination } from '../common/pagination/pagination'
import { Project } from './entity/project.entity'

export type DirectoryProject = Pick<
  Project,
  'id' | 'name' | 'active' | 'public' | 'websiteUrl'
>

export async function getProjectDirectory(
  userId: string,
  {
    take,
    skip,
    search,
    id,
  }: { take: number; skip: number; search?: string; id?: string },
  key?: ApiKeyPrincipal,
): Promise<Pagination<DirectoryProject>> {
  const conditions: string[] = []
  const params: Record<string, string | string[]> = { userId }
  if (key && !key.unrestricted) {
    conditions.push('adminId = {userId:String}')
    if (!key.allProjects) {
      if (!key.projectIds.length)
        return new Pagination({ results: [], total: 0 })
      conditions.push('id IN {allowed:Array(String)}')
      params.allowed = key.projectIds
    }
  } else {
    conditions.push(`(adminId = {userId:String} OR id IN (
      SELECT projectId FROM project_share WHERE userId = {userId:String} AND confirmed = 1
    ))`)
  }
  if (id) {
    conditions.push('id = {id:FixedString(12)}')
    params.id = id
  }
  if (search) {
    conditions.push(
      '(positionCaseInsensitiveUTF8(name, {search:String}) > 0 OR positionCaseInsensitiveUTF8(toString(id), {search:String}) > 0)',
    )
    params.search = search
  }

  const from = `FROM project WHERE ${conditions.join(' AND ')}`
  const [rows, count] = await Promise.all([
    clickhouse
      .query({
        query: `SELECT id, name, toBool(active) AS active, toBool(public) AS public, websiteUrl
        ${from} ORDER BY name, id LIMIT {take:UInt32} OFFSET {skip:UInt32}`,
        query_params: { ...params, take, skip },
      })
      .then((result) => result.json<DirectoryProject>()),
    clickhouse
      .query({
        query: `SELECT count() AS total ${from}`,
        query_params: params,
      })
      .then((result) => result.json<{ total: number }>()),
  ])
  return new Pagination({ results: rows.data, total: count.data[0].total })
}
