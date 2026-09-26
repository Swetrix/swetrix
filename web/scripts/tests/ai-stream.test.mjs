import assert from 'node:assert/strict'
import { test } from 'node:test'
import { askAI } from '../../app/api/index.ts'

const event = (data) => `data: ${JSON.stringify(data)}\n\n`
const encoder = new TextEncoder()

const runStream = async (t, chunks, signal) => {
  const calls = { text: '', complete: 0, errors: [], tools: [] }
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            for (const chunk of chunks)
              controller.enqueue(encoder.encode(chunk))
            controller.close()
          },
        }),
      ),
  )
  await askAI(
    'test-project',
    [{ role: 'user', content: 'Test' }],
    'UTC',
    {
      onText: (text) => {
        calls.text += text
      },
      onToolCall: (name) => calls.tools.push(name),
      onComplete: () => calls.complete++,
      onError: (error) => calls.errors.push(error.message),
    },
    signal,
  )
  return calls
}

test('handles split events and completes exactly once', async (t) => {
  const text = event({ type: 'text', content: 'Hello' })
  const calls = await runStream(t, [
    text.slice(0, 12),
    text.slice(12),
    event({ type: 'done' }),
  ])
  assert.deepEqual(calls, { text: 'Hello', complete: 1, errors: [], tools: [] })
})

test('a stream error is terminal and preserves text already delivered', async (t) => {
  const calls = await runStream(t, [
    event({ type: 'text', content: 'Partial answer' }),
    event({ type: 'error', content: 'Try again' }),
    event({ type: 'done' }),
  ])
  assert.equal(calls.text, 'Partial answer')
  assert.equal(calls.complete, 0)
  assert.deepEqual(calls.errors, ['Try again'])
})

test('a disconnected stream is not treated as a successful answer', async (t) => {
  const calls = await runStream(t, [
    event({ type: 'tool-call', toolName: 'getProjectInfo', args: {} }),
  ])
  assert.deepEqual(calls.tools, ['getProjectInfo'])
  assert.equal(calls.complete, 0)
  assert.equal(calls.errors.length, 1)
})

test('stopping does not call completion or error handlers', async (t) => {
  const controller = new AbortController()
  controller.abort()
  const calls = await runStream(t, [event({ type: 'done' })], controller.signal)
  assert.equal(calls.complete, 0)
  assert.deepEqual(calls.errors, [])
})

test('malformed events fail visibly rather than silently losing the answer', async (t) => {
  const calls = await runStream(t, [
    'data: {invalid}\n\n',
    event({ type: 'done' }),
  ])
  assert.equal(calls.complete, 0)
  assert.equal(calls.errors.length, 1)
})
