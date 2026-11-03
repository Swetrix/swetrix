import assert from 'node:assert/strict'
import test from 'node:test'
import { registerAdminTools } from '../src/admin.js'

const projectId = 'WvZCYTrOPzSK'
const signal = new AbortController().signal

function registry(request, enableWrites = false) {
  const tools = new Map()
  registerAdminTools(
    (name, description, schema, run, annotations) => {
      tools.set(name, {
        schema,
        annotations,
        call: (args) => run(schema.parse(args), { signal }),
      })
    },
    { request },
    { enableWrites },
  )
  return tools
}

test('project discovery forwards bounded pagination and excludes account and project credentials', async () => {
  const tools = registry((path, options) => {
    assert.equal(path, '/v1/project')
    assert.deepEqual(options, {
      query: { search: 'Shop', take: 25, skip: 0 },
      signal,
    })
    return {
      total: 2,
      results: [
        {
          id: projectId,
          name: 'Shop',
          captchaSecretKey: 'secret',
          share: [{}],
          passwordHash: 'hash',
        },
      ],
    }
  })
  assert.deepEqual(await tools.get('list_projects').call({ search: 'Shop' }), {
    results: [{ id: projectId, name: 'Shop' }],
    total: 2,
    nextSkip: 1,
  })
  assert.equal(
    tools.get('list_projects').schema.safeParse({ take: 0 }).success,
    false,
  )
  assert.equal(
    tools.get('get_project').schema.safeParse({ projectId: '../../v1/user' })
      .success,
    false,
  )
})

test('list tools paginate collection endpoints that have no upstream pagination', async () => {
  const tools = registry((path, options) => {
    assert.equal(path, `/v1/project/annotations/${projectId}`)
    assert.deepEqual(options, { signal })
    return ['first', 'second', 'third'].map((text) => ({ text }))
  })
  assert.deepEqual(
    await tools.get('list_annotations').call({ projectId, skip: 1, take: 1 }),
    {
      results: [{ text: 'second' }],
      total: 3,
      nextSkip: 2,
    },
  )
  assert.equal(
    (await tools.get('list_annotations').call({ projectId, skip: 3 })).nextSkip,
    null,
  )
})

test('project details preserve the limited response for a password-protected dashboard', async () => {
  const tools = registry((path) => {
    assert.equal(path, `/v1/project/${projectId}`)
    return { id: projectId, isPasswordProtected: true }
  })
  assert.deepEqual(await tools.get('get_project').call({ projectId }), {
    id: projectId,
    isPasswordProtected: true,
  })
})

test('write tools are opt-in and map valid input to the documented API payload', async () => {
  const calls = []
  const api = (path, options) => {
    calls.push([path, options])
    return {
      id: 'id',
      ...options.body,
      project: { id: projectId, captchaSecretKey: 'secret' },
    }
  }
  const readOnly = registry(api)
  const enabled = registry(api, true)
  const cases = [
    ['create_project', { name: 'Blog' }, '/v1/project', { name: 'Blog' }],
    [
      'create_annotation',
      { projectId, date: '2026-01-02', text: 'Launch' },
      '/v1/project/annotation',
      { pid: projectId, date: '2026-01-02', text: 'Launch' },
    ],
    [
      'create_funnel',
      { projectId, name: 'Checkout', steps: ['/shop', 'purchase'] },
      '/v1/project/funnel',
      { pid: projectId, name: 'Checkout', steps: ['/shop', 'purchase'] },
    ],
  ]
  for (const [name, args, path, body] of cases) {
    assert.equal(readOnly.has(name), false)
    assert.equal(enabled.get(name).annotations.readOnlyHint, false)
    assert.equal(enabled.get(name).annotations.idempotentHint, false)
    const expected = { id: 'id', ...args }
    delete expected.projectId
    assert.deepEqual(await enabled.get(name).call(args), expected)
    assert.deepEqual(calls.at(-1), [path, { method: 'POST', body, signal }])
  }
  assert.equal(
    enabled
      .get('create_annotation')
      .schema.safeParse({ projectId, date: '2026-02-30', text: 'Launch' })
      .success,
    false,
  )
})

test('unknown create-project settings fail before a project can be created', () => {
  const tools = registry(() => assert.fail('Unexpected API request'), true)
  assert.throws(
    () =>
      tools.get('create_project').call({ name: 'Blog', organisationId: 'org' }),
    /Unrecognized key/,
  )
})
