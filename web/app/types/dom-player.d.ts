// `dom-player` is a Vite resolve.alias to `@rrweb/replay` (see vite.config.ts).
// The neutral name keeps "rrweb" out of the served asset URLs, which privacy
// adblock lists block. Re-export the replayer's types under the alias for TS,
// plus the event types from `@rrweb/types` (types-only package, erased at
// compile time) that `@rrweb/replay` itself doesn't re-export.
declare module 'dom-player' {
  export * from '@rrweb/replay'
  export type { eventWithTime } from '@rrweb/types'
}
