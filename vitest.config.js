import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: [
      'shared/engine_v4/**/__tests__/**/*.test.js',
      'client/src/**/__tests__/**/*.test.{js,jsx}',
      'server/**/__tests__/**/*.test.js'
    ],
    exclude: [
      'archive_cleanup/**',
      '**/node_modules/**'
    ],
    testTimeout: 10000,
    globals: true
  },
  resolve: {
    alias: {
      'shared': path.resolve(__dirname, './shared'),
      'client': path.resolve(__dirname, './client/src')
    }
  }
});
