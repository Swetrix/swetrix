module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/cloud/src', '<rootDir>/apps/community/src'],
  testMatch: [
    '**/api-key/*.spec.ts',
    '**/auth/guards/multi-auth.guard.spec.ts',
  ],
}
