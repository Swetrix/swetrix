module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/apps/cloud/src',
    '<rootDir>/apps/community/src',
    '<rootDir>/tests',
  ],
  testMatch: ['**/*idempotency.spec.ts'],
}
