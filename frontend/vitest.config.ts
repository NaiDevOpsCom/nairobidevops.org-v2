import { resolve } from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: "./client",

    // Include both standard test files AND __tests__ directories
    include: ["**/*.{test,spec}.{js,ts,jsx,tsx}", "**/__tests__/**/*.{js,ts,jsx,tsx}"],

    // Test environment for React components
    environment: "jsdom",

    // Enable globals (describe, it, expect without imports)
    globals: true,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text", "json", "html"],
      reportsDirectory: "../coverage", // Relative to client/

      // What to include in coverage
      include: ["src/**/*.{js,ts,jsx,tsx}"],

      // What to exclude from coverage
      exclude: [
        "**/node_modules/**",
        "**/__tests__/**",
        "**/test/**",
        "**/tests/**",
        "**/dist/**",
        "**/build/**",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/types/**",
        "src/main.tsx", // Entry point
        "src/App.tsx", // Main app component (optional)
      ],

      // Coverage thresholds (set to 0 initially, increase gradually)
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "client/src"),
      "@shared": resolve(__dirname, "shared"),
      "@assets": resolve(__dirname, "attached_assets"),
    },
  },
});
