// Module augmentation for `react-qr-code`.
//
// The upstream package ships only a default export in its `.d.ts`, but the
// CJS entry assigns the same component to `exports.QRCode` as well. Vite 8 /
// Rolldown's `__toESM` helper produces a broken default-interop wrapper for
// CJS modules whose source already declares `__esModule: true` and its own
// `default` (the synthetic `.default` ends up pointing at the whole module
// object instead of the component, so `<QRCode />` renders an object and
// throws). Importing the existing-but-undeclared `QRCode` named export
// sidesteps the wrapper.
declare module 'react-qr-code' {
  import type { ComponentType, SVGProps, CSSProperties } from 'react'

  export interface QRCodeProps extends SVGProps<SVGSVGElement> {
    value: string
    size?: number
    bgColor?: CSSProperties['backgroundColor']
    fgColor?: CSSProperties['color']
    level?: 'L' | 'M' | 'H' | 'Q'
    title?: string
  }

  export const QRCode: ComponentType<QRCodeProps>
}
