import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import pkg from './package.json' with { type: 'json' }
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const rrwebDistFile = 'replaylibrary.min.js'
const rrwebPackageFile = 'rrweb.umd.min.cjs'
const rrwebDistPath = join(dirname(require.resolve('rrweb')), rrwebPackageFile)

const copyRrweb = () => ({
  name: 'copy-rrweb',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: rrwebDistFile,
      source: readFileSync(rrwebDistPath),
    })
  },
})

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: pkg.main, format: 'cjs', sourcemap: true },
      { file: pkg.module, format: 'es', sourcemap: true },
    ],
    plugins: [
      typescript({
        outDir: './dist',
        sourceMap: true,
        tslib: require.resolve('tslib'),
      }),
      nodeResolve(),
      commonjs(),
    ],
  },
  {
    input: 'src/index.ts',
    output: [{ file: pkg.browser, format: 'umd', name: 'swetrix', sourcemap: true }],
    plugins: [
      typescript({
        outDir: './dist',
        sourceMap: true,
        tslib: require.resolve('tslib'),
      }),
      nodeResolve(),
      commonjs(),
      copyRrweb(),
      terser(),
    ],
  },
]
