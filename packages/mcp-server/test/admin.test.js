import assert from 'node:assert/strict'
import test from 'node:test'
import { registerAdminTools } from '../src/admin.js'
import { apiBaseUrl, createApi } from '../src/api.js'

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
    assert.equal(path, '/v1/project/directory')
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

test('project info uses an exact directory lookup and treats inaccessible IDs as missing', async () => {
  let results = [
    {
      id: projectId,
      name: 'Shop',
      active: true,
      public: false,
      websiteUrl: null,
    },
  ]
  const tools = registry((path, options) => {
    assert.equal(path, '/v1/project/directory')
    assert.deepEqual(options, { query: { id: projectId, take: 1 }, signal })
    return { results, total: results.length, page_total: results.length }
  })
  const get = () => tools.get('get_project').call({ projectId })
  assert.deepEqual(await get(), results[0])
  results = []
  await assert.rejects(get, /not found or outside/)
})

test('requesting additional dashboard settings preserves the protected project response', async () => {
  const tools = registry((path) => {
    assert.equal(path, `/v1/project/${projectId}`)
    return { id: projectId, isPasswordProtected: true }
  })
  assert.deepEqual(
    await tools.get('get_project').call({ projectId, includeSettings: true }),
    {
      id: projectId,
      isPasswordProtected: true,
    },
  )
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
    const idempotencyKey = 'job-405:' + name
    assert.deepEqual(
      await enabled.get(name).call({ ...args, idempotencyKey }),
      expected,
    )
    assert.deepEqual(calls.at(-1), [
      path,
      { method: 'POST', body, signal, idempotencyKey },
    ])
    assert.throws(() => enabled.get(name).call(args), /idempotencyKey/)
  }
  assert.equal(
    enabled.get('create_annotation').schema.safeParse({
      projectId,
      date: '2026-02-30',
      text: 'Launch',
      idempotencyKey: 'job-1',
    }).success,
    false,
  )
})

test('unknown create-project settings fail before a project can be created', () => {
  const tools = registry(() => assert.fail('Unexpected API request'), true)
  assert.throws(
    () =>
      tools
        .get('create_project')
        .call({ name: 'Blog', organisationId: 'org', idempotencyKey: 'job-1' }),
    /Unrecognized key/,
  )
})

test('creation retries send the original key only in the header and never retry automatically', async () => {
  const keys = []
  const args = {
    projectId,
    date: '2026-11-04',
    text: 'Launch',
    idempotencyKey: 'job-427:release_1.0',
  }
  const api = createApi(
    apiBaseUrl(),
    'test-key',
    async (url, { headers, body }) => {
      keys.push(new Headers(headers).get('Idempotency-Key'))
      assert.equal(url.pathname, '/v1/project/annotation')
      assert.deepEqual(JSON.parse(body), {
        pid: projectId,
        date: args.date,
        text: args.text,
      })
      if (keys.length === 1) throw new TypeError('response lost')
      return Response.json({ id: 'annotation-1', text: args.text })
    },
  )
  const create = registry(api.request, true).get('create_annotation')
  await assert.rejects(create.call(args), /Could not reach/)
  assert.deepEqual(keys, [args.idempotencyKey])
  assert.deepEqual(await create.call(args), {
    id: 'annotation-1',
    text: 'Launch',
  })
  await create.call({ ...args, idempotencyKey: 'job-428' })
  assert.deepEqual(keys, [args.idempotencyKey, args.idempotencyKey, 'job-428'])
  for (const key of ['', 'two words', 'a\nb', 'a'.repeat(129)]) {
    assert.throws(
      () => create.call({ ...args, idempotencyKey: key }),
      /idempotencyKey/,
    )
  }
  assert.equal(keys.length, 3)
})
