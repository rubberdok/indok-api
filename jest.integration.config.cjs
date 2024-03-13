const base = require("./jest.config.cjs");
/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
	...base,
	testMatch: [
		"**/__tests__/integration/**/*.test.ts",
		"**/*.integration.test.ts",
	],
	coverageDirectory: "coverage/integration",
};
