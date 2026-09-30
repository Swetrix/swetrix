module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  watchman: false,
  roots: ['<rootDir>/apps/cloud/src/project'],
  testMatch: ['**/proxy-domain-connect*.spec.ts'],
}
