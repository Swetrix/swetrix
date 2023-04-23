/* eslint-disable import/no-extraneous-dependencies */
import { configure } from '@testing-library/react'
import * as ResizeObserverModule from 'resize-observer-polyfill'
import '@testing-library/jest-dom/extend-expect'

(global as any).ResizeObserver = ResizeObserverModule.default

configure({ testIdAttribute: 'data-testid' })
