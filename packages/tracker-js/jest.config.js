export default {
  preset: 'ts-jest',
  testEnvironment: '<rootDir>/tests/jsdomEnvironment.ts',
  extensionsToTreatAsEsm: ['.ts'],
  watchman: false,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
}
