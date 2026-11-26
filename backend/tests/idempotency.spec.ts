import { getIdempotencyRequest as cloud } from '../apps/cloud/src/common/idempotency'
import { getIdempotencyRequest as community } from '../apps/community/src/common/idempotency'

describe.each([cloud, community])('idempotency keys', (request) => {
  it('makes the header optional and validates a supplied key', () => {
    expect(request('account', 'create_project', undefined, {})).toBeUndefined()
    for (const key of ['', 'embedded space', 'a,b', 'x'.repeat(129)]) {
      expect(() => request('account', 'create_project', key, {})).toThrow(
        'Idempotency-Key',
      )
    }
    expect(request('account', 'create_project', 'A_.-:0', {})).toBeDefined()
  })

  it('isolates accounts and operations and preserves the order of funnel steps', () => {
    const payload = { pid: 'AbC123xYz789', steps: ['/a', '/b'] }
    const original = request('account', 'create_funnel', 'launch-1', payload)
    expect(
      request('account', 'create_funnel', 'launch-1', {
        steps: payload.steps,
        pid: payload.pid,
      }),
    ).toEqual(original)
    expect(
      request('account', 'create_funnel', 'launch-1', {
        ...payload,
        steps: [...payload.steps].reverse(),
      }).fingerprint,
    ).not.toEqual(original.fingerprint)
    expect(
      request('other', 'create_funnel', 'launch-1', payload).requestId,
    ).not.toEqual(original.requestId)
    expect(
      request('account', 'create_annotation', 'launch-1', payload).requestId,
    ).not.toEqual(original.requestId)
  })
})
