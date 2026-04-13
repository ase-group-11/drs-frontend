

module.exports = {
  preset: 'react-native',

  roots: ['<rootDir>/src', '<rootDir>/__tests__'],

  // Runs global mocks before every test file
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Transform TS/TSX via Babel
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Allow Jest to transform these React Native packages
  transformIgnorePatterns: [
    'node_modules/(?!(' + [
      '@react-native',
      'react-native',
      '@react-navigation',
      '@rnmapbox',
      'react-native-svg',
      '@react-native-async-storage',
      '@react-native-community',
    ].join('|') + ')/)',
  ],

  // Module alias resolution (mirrors your tsconfig.json / babel.config.js)
  moduleNameMapper: {
    '^@env$':                    '<rootDir>/__mocks__/envMock.js',
    '^@constants/(.*)$':         '<rootDir>/src/constants/$1',
    '^@theme/(.*)$':             '<rootDir>/src/theme/$1',
    '^@services/(.*)$':          '<rootDir>/src/services/$1',
    '^@types/(.*)$':             '<rootDir>/src/types/$1',
    '^@atoms/(.*)$':             '<rootDir>/src/components/atoms/$1',
    '^@molecules/(.*)$':         '<rootDir>/src/components/molecules/$1',
    '^@organisms/(.*)$':         '<rootDir>/src/components/organisms/$1',
    '^@templates/(.*)$':         '<rootDir>/src/components/templates/$1',
    '^@/components/(.*)$':       '<rootDir>/src/components/$1',
    '^@hooks/(.*)$':             '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$':             '<rootDir>/src/utils/$1',
    '^@screens/(.*)$':           '<rootDir>/src/screens/$1',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  collectCoverageFrom: [
    'src/utils/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
    'src/screens/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],

  coverageThreshold: {
    global: { branches: 60, functions: 70, lines: 70, statements: 70 },
  },

  testTimeout: 15000,
};