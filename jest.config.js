const config = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!axios)'],
  testPathIgnorePatterns: [
    '<rootDir>/app/api/*',
  ],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true,
    },
  },
  moduleNameMapper: {
    '^ui/(.*)': '<rootDir>/app/ui/$1',
    '^hooks/(.*)': '<rootDir>/app/hooks/$1',
    '^redux/(.*)': '<rootDir>/app/redux/$1',
  },
}

module.exports = config
