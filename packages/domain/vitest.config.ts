import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // password.ts uses a deliberately slow, memory-hard KDF: ~410ms and ~64MB
    // per hash on a developer laptop. Several test files hashing in parallel
    // contend for memory and push individual cases past the 5s default. The
    // slowness is the security property, so the timeout moves, not the cost.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      // Every branch in this package is a dirham. See docs/DECISIONS.md.
      thresholds: { branches: 95, functions: 95, lines: 95, statements: 95 },
    },
  },
});
