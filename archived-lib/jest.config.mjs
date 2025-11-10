// jest.config.mjs
export default {
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/tests/__mocks__/styleMock.js",
  },
  testTimeout: 30000, // Increase timeout for API calls
  // This transform property is crucial for Jest to handle ES modules properly.
  transform: {},
};
