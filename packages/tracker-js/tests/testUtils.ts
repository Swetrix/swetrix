interface LocationParts {
  hostname?: string
  pathname?: string
  hash?: string
  search?: string
  protocol?: string
}

/**
 * Sets `window.location` by reconfiguring the underlying jsdom instance via the
 * global helper installed by `jsdomEnvironment.ts`. Defaults preserve a stable
 * "example.com/" base so individual fields can be set in isolation.
 */
export const setLocation = (parts: LocationParts = {}): void => {
  const protocol = parts.protocol ?? 'http:'
  const hostname = parts.hostname ?? 'example.com'
  const pathname = parts.pathname ?? '/'
  const search = parts.search ?? ''
  const hash = parts.hash ?? ''

  const setter = (globalThis as any).__setLocation as ((url: string) => void) | undefined
  if (typeof setter !== 'function') {
    throw new Error('__setLocation is not available - check that the custom jsdom environment is configured')
  }

  setter(`${protocol}//${hostname}${pathname}${search}${hash}`)
}
