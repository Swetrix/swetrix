import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import pkg from './package.json' with { type: 'json' }
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

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
      terser(),
    ],
  },
]
