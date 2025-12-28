import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['js/**/*.test.js', 'admin/**/*.test.js', 'api/**/*.test.js', 'tests/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/sscode/**'],
    globals: true
  }
});
