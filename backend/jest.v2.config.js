/**
 * Scoped jest setup for the v2 analytics API. Only covers the pure modules
 * under apps/cloud/src/analytics/v2 (registry, filter translator, query
 * builder, mappers) — it is not a general backend test runner.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/cloud/src/analytics/v2'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    // common/constants instantiates a Redis client at import time; the v2
    // pure modules transitively import it via analytics.service.ts
    '^ioredis$': '<rootDir>/apps/cloud/src/analytics/v2/__tests__/ioredis.stub.ts',
  },
}
