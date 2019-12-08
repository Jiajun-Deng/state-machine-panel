module.exports = {
  "collectCoverage": true,
  "collectCoverageFrom": [
    "src/**/*.{js,jsx}"
  ],
  "coverageDirectory": "<rootDir>/coverage",
  "coveragePathIgnorePatterns": [],
  "coverageThreshold": {
    "global": {
      "branches": 0,
      "functions": 0,
      "lines": 0,
      "statements": 0
    }
  },
  "restoreMocks": true,
  "testResultsProcessor": "jest-html-reporter",
  "timers": "fake",
  "verbose": true,
  "testURL": "http://localhost",
  "transform": {
    "^.+\\.js$": "./node_modules/babel-jest"
  },
  "moduleNameMapper": {
    "app/plugins/sdk": "<rootDir>/test/_mocks_/app/plugins/sdk.js",
    "app/core/time_series2": "<rootDir>/test/_mocks_/time_series2.js",
},
  "roots": [
    "<rootDir>/src/", "<rootDir>/test/"
  ],
  "moduleDirectories": [
    "node_modules",
    "src"
  ],
  "moduleFileExtensions": ["js", "json", "jsx", "ts", "tsx", "node"]
};