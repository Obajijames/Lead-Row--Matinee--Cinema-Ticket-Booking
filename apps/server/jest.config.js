// apps/server/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 15000,
  verbose: true,
  forceExit: true,
  setupFiles: ['dotenv/config'],
};
