import { useParams } from '@remix-run/react'

export const useRequiredParams = <T extends Record<string, unknown>>() => useParams() as T
