/**
 * Key renames applied to v1 entity payloads (sessions, profiles, session
 * details) so v2 responses use human-readable field names.
 */
const KEY_RENAMES: Record<string, string> = {
  cc: 'country',
  rg: 'region',
  rgc: 'region_code',
  ct: 'city',
  lc: 'locale',
  dv: 'device',
  br: 'browser',
  brv: 'browser_version',
  os: 'os',
  osv: 'os_version',
  ref: 'referrer',
  so: 'utm_source',
  me: 'utm_medium',
  ca: 'utm_campaign',
  te: 'utm_term',
  co: 'utm_content',
  isp: 'isp',
  og: 'organization',
  ut: 'user_type',
  ctp: 'connection_type',
  sdur: 'duration',
}

export const renameEntityKeys = <T extends Record<string, unknown>>(
  entity: T,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(entity)) {
    result[KEY_RENAMES[key] ?? key] = value
  }

  return result
}

export const renameEntityList = (
  entities: unknown,
): Record<string, unknown>[] => {
  if (!Array.isArray(entities)) {
    return []
  }

  return entities.map((entity) =>
    renameEntityKeys(entity as Record<string, unknown>),
  )
}
