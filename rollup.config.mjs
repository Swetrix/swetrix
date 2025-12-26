import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { createRequire } from 'node:module'
import pkg from './package.json' with { type: 'json' }

const require = createRequire(import.meta.url)

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: pkg.main, format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: pkg.module, format: 'es', sourcemap: true, inlineDynamicImports: true },
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
]
