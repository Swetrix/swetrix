// import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import pkg from './package.json' with { type: 'json' }
import { createRequire } from 'node:module'

const CAPTCHA_PATH = 'src/captcha.ts'
const CAPTCHA_LOADER_PATH = 'src/captcha-loader.ts'
const POW_WORKER_PATH = 'src/pow-worker.ts'

const require = createRequire(import.meta.url)

export default [
  {
    input: CAPTCHA_PATH,
    output: [
      {
        file: pkg.captcha,
        format: 'umd',
        name: 'captcha',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        outDir: './dist',
        sourceMap: true,
        tslib: require.resolve('tslib'),
      }),

      // copying assets
      copy({
        targets: [
          { src: 'src/assets/*', dest: 'dist/assets' },
          { src: 'src/pages/*', dest: 'dist/pages' },
        ],
      }),
      terser(),
      // commonjs(),
    ],
  },
  {
    input: CAPTCHA_LOADER_PATH,
    output: [
      {
        file: pkg.captchaloader,
        format: 'umd',
        name: 'captcha-loader',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        outDir: './dist',
        sourceMap: true,
        tslib: require.resolve('tslib'),
      }),
      terser(),
      // commonjs(),
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
    plugins: [
      typescript({
        outDir: './dist',
        sourceMap: true,
        tslib: require.resolve('tslib'),
      }),
      terser(),
      // commonjs(),
    ],
  },
]
