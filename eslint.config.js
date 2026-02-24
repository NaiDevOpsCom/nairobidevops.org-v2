import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import vitest from "@vitest/eslint-plugin";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import securityPlugin from "eslint-plugin-security";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import globals from "globals";

export default [
  // 1. Ignores
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      "**/coverage/**",
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

  // 2b. JS/JSX Config (ensure JSX parsing + globals)
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
  },

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
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: {
        version: "18.3.1",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      // Disabled: eslint-plugin-react@7.37.5 crashes with ESLint 9 Flat Config
      // due to using the deprecated getFilename() API in this rule.
      "react/display-name": "off",
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

  // 8. Other Plugins
  {
    plugins: { security: securityPlugin },
    rules: {
      ...securityPlugin.configs.recommended.rules,
      "security/detect-no-csrf-before-method-override": "off",
      "security/detect-unsafe-regex": "off",
      "security/detect-buffer-noassert": "off",
      "security/detect-child-process": "off",
      "security/detect-object-injection": "off",
    },
  },

  // 6. Vitest (Moved here so its security overrides take precedence)
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
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: { "jsx-a11y": jsxA11yPlugin },
    rules: { ...jsxA11yPlugin.configs.recommended.rules },
  },
  {
    // Re-enabled import rules now that compatibility with ESLint 9 is confirmed/handled
    plugins: { import: importPlugin },
    rules: {
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ["client/src/**/*.{ts,tsx}", "shared/**/*.{ts,tsx}"],
    rules: {
      // Disable unresolved check for code using aliases (@/ or @shared/)
      // as the resolver is not configured in this flat config.
      "import/no-unresolved": "off",
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
    files: ["scripts/**/*.js", "eslint.config.js"],
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
      "import/no-unresolved": "off",
    },
  },

  // 9. Prettier
  prettierConfig,
];
