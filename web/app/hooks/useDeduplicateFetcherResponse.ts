import { useCallback, useRef } from 'react'

const INITIAL = Symbol('initial')

type Comparator<TData> = (previous: TData, current: TData) => boolean

interface Options<TData, TKey> {
  getKey?: (data: TData) => TKey
  isEqual?: Comparator<TData>
}

const isSameReference = <TData>(previous: TData, current: TData) =>
  Object.is(previous, current)

export const useDeduplicateFetcherResponse = <TData, TKey = unknown>({
  getKey,
  isEqual = isSameReference,
}: Options<TData, TKey> = {}) => {
  const lastHandledData = useRef<TData | typeof INITIAL>(INITIAL)
  const lastHandledKey = useRef<TKey | typeof INITIAL>(INITIAL)

  return useCallback(
    (data: TData | null | undefined): data is TData => {
      if (data == null) return false

      if (getKey) {
        const key = getKey(data)

        if (Object.is(lastHandledKey.current, key)) return false

        lastHandledKey.current = key
        lastHandledData.current = data
        return true
      }

      if (
        lastHandledData.current !== INITIAL &&
        isEqual(lastHandledData.current, data)
      ) {
        return false
      }

      lastHandledData.current = data
      return true
    },
    [getKey, isEqual],
  )
}
