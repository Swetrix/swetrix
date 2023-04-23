/* eslint-disable import/no-extraneous-dependencies */
import { configure } from '@testing-library/react'
import * as ResizeObserverModule from 'resize-observer-polyfill'
import '@testing-library/jest-dom/extend-expect'

(global as any).ResizeObserver = ResizeObserverModule.default
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
configure({ testIdAttribute: 'data-testid' })
