// `dom-player` is a Vite resolve.alias to `rrweb` (see vite.config.ts). The
// neutral name keeps "rrweb" out of the served asset URLs, which privacy
// adblock lists block. Re-export rrweb's types under the alias for TS.
declare module 'dom-player' {
  export * from 'rrweb'
}
