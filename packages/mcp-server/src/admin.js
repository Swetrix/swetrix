import { z } from 'zod'
import { projectId } from './schemas.js'

const page = {
  take: z.int().min(1).max(100).default(25),
  skip: z.int().min(0).max(50_000).default(0),
}
const search = z.string().trim().min(1).max(100).optional()
const name = z.string().trim().min(1).max(50)
const projectFields = [
  'id',
  'name',
  'websiteUrl',
  'active',
  'public',
  'organisationId',
]
const funnelFields = ['id', 'name', 'steps']
const annotationFields = ['id', 'date', 'text']
const createAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
}

function pick(record, fields) {
  return Object.fromEntries(
    fields
      .filter((key) => Object.hasOwn(record, key))
      .map((key) => [key, record[key]]),
  )
}

function pageResult(rows, total, skip, fields) {
  return {
    results: rows.map((row) => pick(row, fields)),
    total,
    nextSkip:
      rows.length && skip + rows.length < total ? skip + rows.length : null,
  }
}

export function registerAdminTools(tool, api, { enableWrites }) {
  tool(
    'list_projects',
    'Find accessible Swetrix projects by name and obtain a project ID for analytics tools. Requires projects:read and funnels:read.',
    z.strictObject({ search, ...page }),
    async ({ search, take, skip }, { signal }) => {
      const { results, total } = await api.request('/v1/project', {
        query: { search, take, skip },
        signal,
      })
      return pageResult(results, total, skip, projectFields)
    },
  )

  tool(
    'get_project',
    'Read the project name, website, collection status and dashboard settings. Requires projects:read and funnels:read.',
    z.strictObject({ projectId }),
    async ({ projectId }, { signal }) => {
      const project = await api.request(`/v1/project/${projectId}`, { signal })
      return pick(project, [
        ...projectFields,
        'isPasswordProtected',
        'isArchived',
        'origins',
        'botsProtectionLevel',
        'created',
        'role',
      ])
    },
  )

  tool(
    'list_goals',
    'List the conversion goals configured for a project, including their matching conditions. Requires goals:read.',
    z.strictObject({ projectId, search, ...page }),
    async ({ projectId, search, take, skip }, { signal }) => {
      const { results, total } = await api.request(
        `/v1/goal/project/${projectId}`,
        { query: { search, take, skip }, signal },
      )
      return pageResult(results, total, skip, [
        'id',
        'name',
        'type',
        'matchType',
        'value',
        'metadataFilters',
        'conditions',
        'active',
      ])
    },
  )

  function listProjectItems(name, description, path, fields) {
    tool(
      name,
      description,
      z.strictObject({ projectId, ...page }),
      async ({ projectId, take, skip }, { signal }) => {
        const items = await api.request(path(projectId), { signal })
        return pageResult(
          items.slice(skip, skip + take),
          items.length,
          skip,
          fields,
        )
      },
    )
  }

  listProjectItems(
    'list_segments',
    'List saved dashboard segments (project views), their filters and custom metrics. Requires projects:read.',
    (pid) => `/v1/project/${pid}/views`,
    ['id', 'name', 'type', 'filters', 'customEvents'],
  )
  listProjectItems(
    'list_funnels',
    'List saved conversion funnels and their ordered page or custom-event steps. Requires funnels:read.',
    (pid) => `/v1/project/funnels/${pid}`,
    funnelFields,
  )
  listProjectItems(
    'list_annotations',
    'List dated dashboard annotations to help explain changes in project traffic. Requires annotations:read.',
    (pid) => `/v1/project/annotations/${pid}`,
    annotationFields,
  )

  if (!enableWrites) return

  tool(
    'create_project',
    'Create a personal analytics project. Requires projects:write and an API key with access to all projects.',
    z.strictObject({ name, websiteUrl: z.httpUrl().max(512).optional() }),
    async (body, { signal }) =>
      pick(
        await api.request('/v1/project', { method: 'POST', body, signal }),
        projectFields,
      ),
    createAnnotations,
  )
  tool(
    'create_annotation',
    'Add a dated note to a project dashboard. Requires annotations:write.',
    z.strictObject({
      projectId,
      date: z.iso.date(),
      text: z.string().trim().min(1).max(120),
    }),
    async ({ projectId, date, text }, { signal }) => {
      const annotation = await api.request('/v1/project/annotation', {
        method: 'POST',
        body: { pid: projectId, date, text },
        signal,
      })
      return pick(annotation, annotationFields)
    },
    createAnnotations,
  )
  tool(
    'create_funnel',
    'Save a named funnel with 2–10 ordered steps. Page paths start with / and other steps are custom event names. Requires funnels:write.',
    z.strictObject({
      projectId,
      name,
      steps: z
        .array(
          z
            .string()
            .trim()
            .min(1)
            .max(2048)
            .regex(/^[^,]+$/, 'Saved funnel steps cannot contain commas'),
        )
        .min(2)
        .max(10),
    }),
    async ({ projectId, name, steps }, { signal }) => {
      const funnel = await api.request('/v1/project/funnel', {
        method: 'POST',
        body: { pid: projectId, name, steps },
        signal,
      })
      return pick(funnel, funnelFields)
    },
    createAnnotations,
  )
}
