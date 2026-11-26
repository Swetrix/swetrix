const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const { registerHooks } = require('node:module')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

async function checkStartup() {
  const net = require('node:net')
  net.Socket.prototype.connect = () => {
    throw new Error('Startup tests must not connect to external services')
  }
  net.Server.prototype.listen = () => {
    throw new Error('Startup tests must not open listening sockets')
  }
  const ts = require('typescript')
  const configPath = path.resolve(
    __dirname,
    '../apps/community/tsconfig.app.json',
  )
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  const { options } = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
  )
  require.extensions['.ts'] = (module, filename) => {
    const { outputText } = ts.transpileModule(
      fs.readFileSync(filename, 'utf8'),
      {
        fileName: filename,
        compilerOptions: options,
      },
    )
    module._compile(outputText, filename)
  }
  const stubs = {
    ioredis: `
      const { EventEmitter } = require('node:events')
      module.exports = class Redis extends EventEmitter {
        defineCommand() {}
      }
    `,
    bullmq: `
      const { EventEmitter } = require('node:events')
      class Queue extends EventEmitter {
        constructor(name, opts) { super(); this.name = name; this.opts = opts }
        async close() {}
      }
      exports.Queue = Queue
      exports.Worker = class Worker extends Queue {}
      exports.QueueEvents = class QueueEvents extends Queue {}
      exports.FlowProducer = class FlowProducer extends Queue {}
    `,
  }
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('swetrix-test:')) {
        return { url: specifier, shortCircuit: true }
      }
      if (Object.hasOwn(stubs, specifier)) {
        return { url: `swetrix-test:${specifier}`, shortCircuit: true }
      }
      return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
      if (url.startsWith('swetrix-test:')) {
        return {
          format: 'commonjs',
          source: stubs[url.slice('swetrix-test:'.length)],
          shortCircuit: true,
        }
      }
      return nextLoad(url, context)
    },
  })

  require('reflect-metadata')
  const { NestFactory } = require('@nestjs/core')
  const { NestApplication } = require('@nestjs/core/nest-application.js')
  const { SchedulerRegistry } = require('@nestjs/schedule')
  const create = NestFactory.create.bind(NestFactory)
  const ready = new Promise((resolve, reject) => {
    NestFactory.create = (module, options) =>
      create(module, { ...options, logger: false, abortOnError: false })
    NestApplication.prototype.listen = async function (port) {
      try {
        assert.equal(port, 5005)
        await this.init()
        resolve(this)
      } catch (error) {
        reject(error)
      }
    }
  })
  require('../apps/community/src/main.ts')
  const app = await ready
  const {
    SessionReplayExportProcessor,
  } = require('../apps/community/src/analytics/session-replay-export.processor.ts')
  const {
    DataImportProcessor,
  } = require('../apps/community/src/data-import/data-import.processor.ts')
  const { I18nService } = require('nestjs-i18n')
  try {
    assert.ok(app.get(SessionReplayExportProcessor).worker)
    assert.ok(app.get(DataImportProcessor).worker)
    const cronJobs = app.get(SchedulerRegistry).getCronJobs()
    assert.equal(cronJobs.size, process.env.IS_PRIMARY_NODE === 'true' ? 2 : 0)
    assert.ok(app.get(I18nService).getSupportedLanguages().includes('en'))
  } finally {
    await app.close()
  }
  console.log('Community startup verified')
}

if (process.argv.includes('--check-startup')) {
  checkStartup().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
} else {
  for (const primary of ['true', 'false']) {
    test(`Community Edition initializes and shuts down with IS_PRIMARY_NODE=${primary}`, (t) => {
      const directory = fs.mkdtempSync(
        path.join(os.tmpdir(), 'swetrix-community-'),
      )
      t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
      const result = spawnSync(
        process.execPath,
        [__filename, '--check-startup'],
        {
          cwd: directory,
          env: {
            PATH: process.env.PATH,
            NODE_ENV: 'production',
            IS_PRIMARY_NODE: primary,
            SECRET_KEY_BASE: 'community-startup-test-secret',
            CLICKHOUSE_HOST: 'http://127.0.0.1',
            CLICKHOUSE_PORT: '8123',
            CLICKHOUSE_DATABASE: 'analytics',
            REDIS_HOST: '127.0.0.1',
            REDIS_PORT: '6379',
          },
          encoding: 'utf8',
          timeout: 30000,
        },
      )
      assert.equal(result.status, 0, result.stderr || result.error?.message)
      assert.match(result.stdout, /Community startup verified/)
    })
  }
}
