import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import 'reflect-metadata'
import * as common from '@nestjs/common'
import { DependenciesScanner } from '@nestjs/core/scanner'
import { NestContainer } from '@nestjs/core/injector/container'
import ts from 'typescript'

const sourceRoot = fileURLToPath(
  new URL('../apps/community/src/', import.meta.url),
)
const modules = {
  ProjectModule: 'project/project.module.ts',
  AnalyticsModule: 'analytics/analytics.module.ts',
  ExperimentModule: 'experiment/experiment.module.ts',
  GoalModule: 'goal/goal.module.ts',
  FeatureFlagModule: 'feature-flag/feature-flag.module.ts',
}
const modulePaths = new Set(
  Object.values(modules).map((path) => resolve(sourceRoot, path)),
)

function loadModuleGraph(entry) {
  const cache = new Map()
  class ExternalModule {}
  common.Module({})(ExternalModule)
  const stubs = new Proxy({}, { get: () => ExternalModule })

  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        experimentalDecorators: true,
      },
      fileName: filename,
    })

    // Keep real module evaluation order without loading services or opening connections.
    const require = (specifier) => {
      if (specifier === '@nestjs/common') return common
      if (specifier === '@nestjs/bullmq') {
        return { BullModule: { registerQueue: () => ExternalModule } }
      }
      const dependency = resolve(dirname(filename), `${specifier}.ts`)
      return modulePaths.has(dependency) ? load(dependency) : stubs
    }
    runInNewContext(
      outputText,
      { exports: module.exports, require },
      { filename },
    )
    return module.exports
  }

  return load(resolve(sourceRoot, modules[entry]))[entry]
}

for (const entry of Object.keys(modules)) {
  test(`Community Edition module imports resolve when loaded through ${entry}`, async () => {
    const root = loadModuleGraph(entry)
    const container = new NestContainer()
    const scanner = new DependenciesScanner(container)

    await scanner.scanForModules({ moduleDefinition: root })

    const registered = new Set(
      [...container.getModules().values()].map(({ metatype }) => metatype.name),
    )
    for (const name of Object.keys(modules)) {
      assert.ok(
        registered.has(name),
        `${name} should be reachable from ${entry}`,
      )
    }
  })
}
