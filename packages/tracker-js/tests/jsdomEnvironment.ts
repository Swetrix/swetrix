import JSDOMEnvironment from 'jest-environment-jsdom'
import type { EnvironmentContext, JestEnvironmentConfig } from '@jest/environment'

/**
 * Extends jest-environment-jsdom to expose a `__setLocation` global so tests
 * can change `window.location` via `JSDOM#reconfigure`. Direct assignment or
 * `Object.defineProperty(window, 'location', ...)` no longer works in jsdom 22+
 * because the property is defined as non-configurable.
 */
export default class CustomJSDOMEnvironment extends JSDOMEnvironment {
  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context)

    const dom = (this as any).dom

    ;(this.global as any).__setLocation = (url: string) => {
      dom.reconfigure({ url })
    }
  }
}
