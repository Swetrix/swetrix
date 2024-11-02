import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import pkg from './package.json' with { type: 'json' }

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
      }),
      nodeResolve(),
      commonjs(),
      terser(),
    ],
  },
]
