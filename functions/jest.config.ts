import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: { module: "CommonJS", allowJs: true } }],
  },
  // The core package ships ESM-only with an "import"-conditioned exports map,
  // which Jest's CJS resolver cannot follow — map its subpaths to dist files
  // and transpile the package to CJS.
  transformIgnorePatterns: ["/node_modules/(?!@fm-budget-control/)"],
  moduleNameMapper: {
    "^@fm-budget-control/fm-budget-control-core/user/application$":
      "<rootDir>/node_modules/@fm-budget-control/fm-budget-control-core/dist/user/application/use-cases/index.js",
    "^@fm-budget-control/fm-budget-control-core/user/ports$":
      "<rootDir>/node_modules/@fm-budget-control/fm-budget-control-core/dist/user/application/ports/index.js",
    "^@fm-budget-control/fm-budget-control-core/kernel/ports$":
      "<rootDir>/node_modules/@fm-budget-control/fm-budget-control-core/dist/kernel/application/ports/index.js",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.spec.ts"],
  passWithNoTests: true,
};

export default config;
