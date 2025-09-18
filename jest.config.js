import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'Utils/**/*.{js,jsx,ts,tsx}',
    'scrapers/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5,
    },
    // Realistic thresholds for critical modules
    'Utils/consolidatedMatching.ts': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    'app/api/match-users/route.ts': {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  coverageDirectory: 'coverage',
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/', // Exclude Playwright tests
    '/playwright-report/',
    '/.next/',
    '/out/',
    '/dist/',
    '/coverage/',
    '/tmp/',
    '/cache/',
    '/scripts/', // Exclude scraper scripts
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(cheerio|parse5|domhandler|domutils|entities|nth-check|boolbase|css-select|css-what|htmlparser2|readable-stream|string_decoder|inherits|isarray|core-util-is|buffer|process|util|events|stream|path|os|fs|crypto|url|querystring|punycode|http|https|zlib|assert|constants|domain|dns|net|tls|tty|v8|vm|worker_threads|child_process|cluster|dgram|dns|fs|http|https|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|timers|tls|tty|url|util|v8|vm|worker_threads|zlib)/)',
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  // Add timeout for async operations
  testTimeout: 10000,
  // Detect open handles to prevent hanging tests
  detectOpenHandles: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig)
