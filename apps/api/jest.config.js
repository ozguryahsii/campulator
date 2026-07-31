module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@campulator/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
