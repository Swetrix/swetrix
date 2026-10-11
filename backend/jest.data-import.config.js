module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/data-import*.spec.ts'],
  testTimeout: 60000,
}
