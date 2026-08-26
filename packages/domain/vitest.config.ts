import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      // Every branch in this package is a dirham. See docs/DECISIONS.md.
      thresholds: { branches: 95, functions: 95, lines: 95, statements: 95 },
    },
  },
});
