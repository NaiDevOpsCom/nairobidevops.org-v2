import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import promisePlugin from "eslint-plugin-promise";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import prettierConfig from "eslint-config-prettier";
import vitest from "@vitest/eslint-plugin";
import globals from "globals";

export default [
  // 1. Ignores
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      "**/.vite",
      "client/public/analytics.js",
      "**/*.min.js",
      "vercel.json",
      "luma.ics",
      ".git-blame-ignore-revs",
      ".deepsource.toml",
      ".github/dependabot.yml",
    ],
  },

  // 2. Base Config
  js.configs.recommended,

  // 3. TS Config
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
    },
  },

  // 4. React
  {
    files: ["**/*.{jsx,tsx}"],
    ...reactPlugin.configs.flat.recommended,
  },
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: { "react-hooks": reactHooksPlugin },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
  },

  // 5. Unused Imports
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "unused-imports": unusedImportsPlugin,
    },
    rules: {
      "unused-imports/no-unused-imports": "error",
    },
  },

  // 6. Vitest
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.{test,spec}.{ts,tsx}"],
    plugins: {
      vitest,
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },

  // 7. Other Plugins
  {
    plugins: { "jsx-a11y": jsxA11yPlugin },
    rules: { ...jsxA11yPlugin.configs.recommended.rules },
  },
  {
    plugins: { promise: promisePlugin },
    rules: { ...promisePlugin.configs.recommended.rules },
  },
  {
    plugins: { import: importPlugin },
    rules: {
      ...importPlugin.configs.recommended.rules,
      "import/no-unresolved": "off",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
        },
      ],
    },
  },

  // 8. Overrides & Global Rules
  {
    rules: {
      "react/prop-types": "off",
    },
  },

  // Scripts directory
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
      "no-process-exit": "off",
      "no-redeclare": "off",
      "import/order": "off",
    },
  },

  // 9. Prettier
  prettierConfig,
];
