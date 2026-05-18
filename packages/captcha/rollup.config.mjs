import copy from 'rollup-plugin-copy'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import pkg from './package.json' with { type: 'json' }
import { createRequire } from 'node:module'

const CAPTCHA_PATH = 'src/captcha.ts'
const CAPTCHA_LOADER_PATH = 'src/index.ts'
const POW_WORKER_PATH = 'src/pow-worker.ts'

const require = createRequire(import.meta.url)

const typescriptPlugin = () =>
  typescript({
    outDir: './dist',
    sourceMap: true,
    tslib: require.resolve('tslib'),
  })

export default [
  {
    input: CAPTCHA_LOADER_PATH,
    output: [
      { file: pkg.main, format: 'cjs', sourcemap: true, exports: 'named' },
      { file: pkg.module, format: 'es', sourcemap: true },
    ],
    plugins: [typescriptPlugin()],
  },
  {
    input: CAPTCHA_LOADER_PATH,
    output: [{ file: pkg.browser, format: 'umd', name: 'swetrixCaptcha', sourcemap: true, exports: 'named' }],
    plugins: [typescriptPlugin(), terser()],
  },
  {
    input: CAPTCHA_PATH,
    output: [
      {
        file: pkg.captcha,
        format: 'iife',
        name: 'captcha',
        sourcemap: true,
      },
    ],
    plugins: [
      typescriptPlugin(),
      copy({
        targets: [{ src: 'src/pages/*', dest: 'dist/pages' }],
      }),
      terser(),
    ],
  },
  {
    input: POW_WORKER_PATH,
    output: [
      {
        file: 'dist/pow-worker.js',
        format: 'iife',
        name: 'powWorker',
        sourcemap: true,
      },
    ],
    plugins: [typescriptPlugin(), terser()],
  },
]
