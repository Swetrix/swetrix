import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import typescript from 'rollup-plugin-typescript2'
import { uglify } from 'rollup-plugin-uglify'
import pkg from './package.json'

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
      { file: pkg.origbrowser, format: 'umd', name: 'swetrix' },
    ],
    plugins: [
      typescript(), nodeResolve(), commonjs(), sourceMaps(),
    ]
  },
  {
    input: 'src/index.ts',
    output: [
      { file: pkg.browser, format: 'umd', name: 'swetrix' },
    ],
    plugins: [
      typescript(), nodeResolve(), commonjs(), uglify(),
    ]
  }
]
