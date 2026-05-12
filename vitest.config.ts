import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    include: ['lib/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
