require("dotenv/config");

/** @type {import('jest').Config} */
const config = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/tests"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"^p-retry$": "<rootDir>/jest-mocks/p-retry.js",
		"^is-network-error$": "<rootDir>/jest-mocks/is-network-error.js",
	},
	transformIgnorePatterns: [
		"/node_modules/(?!p-limit|yocto-queue)/",
	],
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: false,
				tsconfig: {
					module: "commonjs",
					target: "ES2022",
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
				},
			},
		],
	},
};

module.exports = config;
