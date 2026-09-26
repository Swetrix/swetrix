import assert from 'node:assert/strict'
import { test } from 'node:test'
import { modelMessageSchema, streamText, stepCountIs, tool } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { z } from 'zod'
import { toJsonToolOutput } from './tool-output.ts'

const projectInfo = {
  name: 'Test project',
  created: new Date('2021-08-16T00:49:16Z'),
  experiments: [{ startedAt: new Date('2026-09-01T12:00:00Z'), endedAt: null }],
  optionalField: undefined,
}

const toolMessage = (output) => ({
  role: 'tool',
  content: [
    {
      type: 'tool-result',
      toolCallId: 'call-1',
      toolName: 'getProjectInfo',
      output,
    },
  ],
})

test('normalizes database dates and omitted values into a valid model message', () => {
  assert.equal(
    modelMessageSchema.safeParse(
      toolMessage({ type: 'json', value: projectInfo }),
    ).success,
    false,
  )
  const output = toJsonToolOutput({ output: projectInfo })
  assert.equal(modelMessageSchema.safeParse(toolMessage(output)).success, true)
  assert.deepEqual(output.value, {
    name: 'Test project',
    created: '2021-08-16T00:49:16.000Z',
    experiments: [{ startedAt: '2026-09-01T12:00:00.000Z', endedAt: null }],
  })
  assert.ok(projectInfo.created instanceof Date)
})

test('streams an answer after a tool returns database Date objects', async () => {
  const usage = { inputTokens: { total: 1 }, outputTokens: { total: 1 } }
  const model = new MockLanguageModelV4({
    doStream: [
      {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'tool-call',
              toolCallId: 'call-1',
              toolName: 'getProjectInfo',
              input: '{}',
            })
            controller.enqueue({
              type: 'finish',
              finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
              usage,
            })
            controller.close()
          },
        }),
      },
      {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text-start', id: 'text-1' })
            controller.enqueue({
              type: 'text-delta',
              id: 'text-1',
              delta: 'Your project was created in August 2021.',
            })
            controller.enqueue({ type: 'text-end', id: 'text-1' })
            controller.enqueue({
              type: 'finish',
              finishReason: { unified: 'stop', raw: 'stop' },
              usage,
            })
            controller.close()
          },
        }),
      },
    ],
  })
  const result = streamText({
    model,
    prompt: 'When was my project created?',
    tools: {
      getProjectInfo: tool({
        inputSchema: z.object({}),
        execute: async () => projectInfo,
        toModelOutput: toJsonToolOutput,
      }),
    },
    stopWhen: stepCountIs(2),
  })
  const parts = []
  for await (const part of result.fullStream) parts.push(part)
  assert.equal(
    parts.some((part) => part.type === 'error'),
    false,
  )
  assert.equal(await result.text, 'Your project was created in August 2021.')
  assert.equal(model.doStreamCalls.length, 2)
  const output = model.doStreamCalls[1].prompt.find(
    (message) => message.role === 'tool',
  ).content[0].output
  assert.equal(output.value.created, '2021-08-16T00:49:16.000Z')
})
