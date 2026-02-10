import { fileURLToPath } from "node:url";
import path from "node:path";

import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import securityPlugin from "eslint-plugin-security";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import promisePlugin from "eslint-plugin-promise";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import prettierConfig from "eslint-config-prettier";
import vitest from "@vitest/eslint-plugin";
import { fixupPluginRules } from "@eslint/compat";
import globals from "globals";

// Recreate __dirname for ESM context
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  // 1. Ignore generated files
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.vite/**",
      "client/public/analytics.js",
      "**/*.min.js",
      "vercel.json",
      "luma.ics",
      ".git-blame-ignore-revs",
      ".deepsource.toml",
      ".github/dependabot.yml",
    ],
  },

  // 2. Tell ESLint what files to lint (Flat Config REQUIRED)
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // 3. Base JS rules
  js.configs.recommended,

  // 4. TypeScript rules
  {
    plugins: { "@typescript-eslint": fixupPluginRules(tsPlugin) },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },

  // 5. React recommended rules
  {
    plugins: { react: fixupPluginRules(reactPlugin) },
    rules: reactPlugin.configs.flat.recommended.rules,
  },

  // 6. React Hooks
  {
    plugins: { "react-hooks": fixupPluginRules(reactHooksPlugin) },
    rules: reactHooksPlugin.configs.recommended.rules,
  },

  // 7. Security plugin
  {
    plugins: { security: fixupPluginRules(securityPlugin) },
    rules: { ...securityPlugin.configs.recommended.rules },
  },

  // 8. JSX A11y
  {
    plugins: { "jsx-a11y": fixupPluginRules(jsxA11yPlugin) },
    rules: { ...jsxA11yPlugin.configs.recommended.rules },
    languageOptions: {
      parserOptions: { ...jsxA11yPlugin.configs.recommended.parserOptions },
    },
  },

  // 9. Promise plugin
  {
    plugins: { promise: fixupPluginRules(promisePlugin) },
    rules: { ...promisePlugin.configs.recommended.rules },
  },

  // 10. Import plugin
  {
    plugins: { import: fixupPluginRules(importPlugin) },
    rules: {
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
        },
      ],
    },
  },

  // 11. TS/React project-specific overrides
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "unused-imports": fixupPluginRules(unusedImportsPlugin),
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: __dirname,
        projectService: true,
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: globals.browser,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Security
      "no-eval": "error",
      "security/detect-object-injection": "off",

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Clean imports
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  // 11b. Scripts directory - Node environment with relaxed rules
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Allow console/process in scripts
      "no-console": "off",
      "no-process-exit": "off",
      "no-redeclare": "off",
      // Security rules that might conflict with scripts
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
      // Import rules that might not apply to build scripts
      "import/order": "off",
      // React rules (not needed for scripts)
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
    },
  },

  // 11c. Config files (vite, tailwind, etc.) - Node environment
  {
    files: ["*.config.ts", "*.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },

  // 11d. Test files - use vitest plugin and allow dynamic file system access
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.{test,spec}.{ts,tsx}"],
    plugins: {
      vitest: fixupPluginRules(vitest),
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "security/detect-non-literal-fs-filename": "off",
    },
  },

  // 12. Prettier config (must be last to disable conflicting formatting rules)
  prettierConfig,
];
