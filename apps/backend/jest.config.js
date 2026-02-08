require("dotenv/config");

/** @type {import('jest').Config} */
const config = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/tests"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
	},
	transformIgnorePatterns: [
		"node_modules/(?!(p-limit|yocto-queue|p-retry|is-network-error)/)",
	],
	transform: {
		"^.+\\.tsx?$": "ts-jest",
		"^.+\\.js$": "ts-jest",
	},
};

module.exports = config;
