import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/server.js'],
      reporter: ['text', 'lcov'],
      thresholds: {
        // The scoring domain is the part worth guarding; these floors are for
        // the repo as a whole and src/domain sits far above them.
        lines: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});
