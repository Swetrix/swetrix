import { useParams } from 'react-router'

export const useRequiredParams = <T extends Record<string, unknown>>() => useParams() as T
