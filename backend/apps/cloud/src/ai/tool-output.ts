import type { JSONValue } from 'ai'

export const toJsonToolOutput = ({ output }: { output: unknown }) => ({
  type: 'json' as const,
  value: JSON.parse(JSON.stringify(output ?? null)) as JSONValue,
})
