/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: false,

  collectCoverageFrom: [
    "src/**/*.{ts,js}",
    "!**/test-clients/**",
    "!**/__tests__/**",
    "!**/__mocks__/**",
    "!**/__types__.ts",
    "!**/interfaces.ts",
    "!**/seed.ts",
    "!**/type-defs.ts",
    "!src/graphql/types.generated.ts",
    "!**/*.test.ts",
    "!**/schema.mappers.ts",
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage/unit",

  coverageReporters: ["clover", "json", "lcov"],

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  // The glob patterns Jest uses to detect test files
  testMatch: ["**/__tests__/unit/**/*.test.ts", "**/*.unit.test.ts"],

  modulePathIgnorePatterns: ["<rootDir>/dist/"],

  extensionsToTreatAsEsm: [".ts"],

  // https://github.com/swc-project/jest/issues/64
  // imports with .js extension fails
  // this is a workaround
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  // A map from regular expressions to paths to transformers
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
};
