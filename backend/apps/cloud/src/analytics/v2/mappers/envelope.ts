export interface V2Envelope<T> {
  data: T
  meta: Record<string, unknown>
}

export const envelope = <T>(
  data: T,
  meta: Record<string, unknown> = {},
): V2Envelope<T> => ({ data, meta })
