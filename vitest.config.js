import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: [
        'src/server.js',
        // Requires a live database, so it cannot be covered by the unit suite.
        // The right way to cover it is a repository contract suite run against
        // both drivers -- see README ("What I'd do differently with more time").
        'src/repositories/postgres/**',
        'src/repositories/index.js',
      ],
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
