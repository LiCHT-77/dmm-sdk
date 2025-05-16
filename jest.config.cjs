/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // ESM support for node-fetch or other ESM modules if needed
  // transform: {
  //   '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  // },
  // extensionsToTreatAsEsm: ['.ts'],
  // moduleNameMapper: {
  //   '^(\\.{1,2}/.*)\\.js$': '$1',
  // },
  // globals: {
  //   'ts-jest': {
  //     useESM: true,
  //   },
  // },
};