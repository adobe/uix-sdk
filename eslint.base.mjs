/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import importSort from "eslint-plugin-simple-import-sort";
import sonarjs from "eslint-plugin-sonarjs";
import sortKeysFix from "eslint-plugin-sort-keys-fix";
import vitest from "eslint-plugin-vitest";
import globals from "globals";
import ts from "typescript-eslint";

const globalsBrowser = Object.fromEntries(
  Object.entries(globals.browser).map(([key, val]) => [key.trim(), val]),
);

export const createConfig = ({ tsconfigRootDir, includeReact = false }) => {
  const tsconfigConfig = {
    project: "./tsconfig.json",
    tsconfigRootDir,
  };

  const configs = [
    js.configs.recommended,
    ts.configs.recommended,
    sonarjs.configs.recommended,
    prettierRecommended,

    // project
    {
      files: ["**/*.ts", "**/*.tsx"],
      languageOptions: {
        parserOptions: {
          ...tsconfigConfig,
        },
        ecmaVersion: "latest",
        globals: globalsBrowser,
      },
    },

    // imports
    {
      files: ["**/*.ts", "**/*.tsx"],
      settings: {
        "import/resolver": {
          typescript: {
            ...tsconfigConfig,
          },
        },
      },
      plugins: { import: importPlugin },
      rules: {
        ...importPlugin.flatConfigs.recommended.rules,
        "import/no-cycle": "error",
        "import/no-unresolved": "off",
        "import/export": "error",
        "import/no-deprecated": "warn",
        "import/first": "error",
        "import/no-default-export": "error",
        "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
        "import/no-duplicates": [
          "error",
          {
            considerQueryString: true,
            "prefer-inline": false,
          },
        ],
      },
    },

    // import sort
    {
      files: ["**/*.ts", "**/*.tsx", "**/*.js"],
      plugins: { "simple-import-sort": importSort },
      rules: {
        "simple-import-sort/imports": [
          "error",
          {
            groups: [
              [
                "^react",
                "^react(-.*)?",
                "^(?!src/|i18n/|tests/|assets/|@aem-sites/|@react-spectrum/|react)(@?\\w.*)$",
                "^@(aem-sites|react-spectrum)(?!/s2/(icons|illustrations))/.*$",
                "^src/",
                "^\\.",
                "^\\./",
                "^i18n/",
                "^tests/",
                "^\\.\\.?/.*(?<!s?css)$",
                "^\\.\\.?$",
                "^@spectrum-icons/.*$",
                "^@react-spectrum/s2/icons/.*$",
                "^@react-spectrum/s2/illustrations/.*$",
                "^assets/",
                "^\\.\\.?/.*(?<!s?css)$",
                "^\\.\\.?$",
                "\\.s?css$",
              ],
            ],
          },
        ],
      },
    },

    // typescript
    {
      files: ["**/*.ts", "**/*.tsx"],
      languageOptions: {
        parser: ts.parser,
        parserOptions: {
          ...tsconfigConfig,
        },
      },
      rules: {
        "no-undef": "error",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_$",
            varsIgnorePattern: "^_$",
            caughtErrorsIgnorePattern: "^_$",
          },
        ],
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-unsafe-return": "warn",
        "@typescript-eslint/no-empty-function": ["warn", { allow: [] }],
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-empty-interface": "error",
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
        "@typescript-eslint/no-unnecessary-template-expression": "error",
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            prefer: "type-imports",
            fixStyle: "inline-type-imports",
          },
        ],
        "@typescript-eslint/no-unused-expressions": [
          "error",
          {
            allowShortCircuit: true,
            allowTernary: true,
            allowTaggedTemplates: false,
          },
        ],
      },
    },

    // complexity
    {
      files: ["**/*.ts", "**/*.tsx", "**/*.js"],
      rules: {
        "no-unused-vars": "off",
        "max-lines-per-function": [
          "warn",
          {
            max: 75,
            skipBlankLines: true,
            skipComments: true,
          },
        ],
        complexity: ["error", { max: 15 }],
        "max-params": ["error", { max: 4 }],
        "max-statements": ["warn", { max: 15 }],
      },
    },

    // sonarjs
    {
      files: ["**/*.ts", "**/*.tsx", "**/*.js"],
      rules: {
        "sonarjs/todo-tag": "warn",
        "sonarjs/no-commented-code": "warn",
      },
    },

    // style
    {
      files: ["**/*.ts", "**/*.tsx", "**/*.js"],
      rules: {
        // quotes is handled by prettier; do not override here
        "object-shorthand": ["error", "always"],
        "prefer-template": ["error"],
        "no-useless-concat": ["error"],
        "spaced-comment": ["error", "always", { markers: ["/"] }],
        "prefer-arrow-callback": ["error"],
        "func-style": ["warn", "expression"],
        "arrow-body-style": ["error", "as-needed"],
        "no-multiple-empty-lines": ["error", { max: 1 }],
        curly: ["error", "all"],
        "padding-line-between-statements": [
          "error",
          { blankLine: "always", prev: "import", next: "*" },
          { blankLine: "any", prev: "import", next: "import" },
          {
            blankLine: "always",
            prev: ["const", "let"],
            next: [
              "expression",
              "block",
              "block-like",
              "return",
              "if",
              "function",
              "class",
              "for",
              "do",
              "while",
              "switch",
              "try",
              "with",
            ],
          },
          { blankLine: "any", prev: ["const"], next: ["const"] },
          { blankLine: "any", prev: ["let"], next: ["let"] },
          { blankLine: "always", prev: ["block", "block-like"], next: "*" },
          { blankLine: "always", prev: "*", next: "if" },
          { blankLine: "always", prev: "if", next: "*" },
          { blankLine: "always", prev: "*", next: "export" },
          { blankLine: "any", prev: "export", next: "export" },
        ],
        // comma-dangle is handled by prettier; do not override here
      },
    },

    // sort-keys-fix
    {
      files: ["src/**/*", "**/src/**/*"],
      plugins: { "sort-keys-fix": sortKeysFix },
      rules: {
        "sort-keys-fix/sort-keys-fix": "warn",
      },
    },

    // tests
    {
      files: ["**/tests/**/*", "**/*.test.ts", "**/*.test.tsx"],
      languageOptions: {
        globals: {
          ...vitest.environments?.env?.globals,
          global: true,
          jest: true,
        },
      },
      rules: {
        "max-lines-per-function": [
          "error",
          {
            max: 200,
            skipBlankLines: true,
            skipComments: true,
          },
        ],
      },
    },

    // exceptions: configs
    {
      files: ["**/{eslint,prettier,vite,vitest}.config.{js,ts,mts,mjs}"],
      languageOptions: {
        globals: {
          ...globals.node,
        },
      },
      rules: {
        "import/no-default-export": "off",
      },
    },

    // exceptions: messages
    {
      files: ["src/messages/**"],
      rules: {
        "import/no-default-export": "off",
      },
    },

    // exceptions: type definitions
    {
      files: ["**/*.d.ts"],
      rules: {
        "import/no-default-export": "off",
        "no-undef": "off",
      },
    },
  ];

  if (includeReact) {
    configs.push(
      // react-refresh
      {
        files: ["**/*.ts", "**/*.tsx", "**/*.js"],
        plugins: { "react-refresh": reactRefresh },
        rules: {
          ...reactRefresh.configs.recommended.rules,
          "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
        },
      },

      // react-hooks
      {
        files: ["**/*.ts", "**/*.tsx", "**/*.js"],
        plugins: { "react-hooks": reactHooks },
        rules: {
          "react-hooks/rules-of-hooks": "error",
          "react-hooks/exhaustive-deps": "error",
        },
      },

      // react
      {
        files: ["**/*.ts", "**/*.tsx", "**/*.js"],
        plugins: { react },
        settings: { react: { version: "detect" } },
        rules: {
          ...react.configs.flat.recommended.rules,
          "react/react-in-jsx-scope": "off",
          "react/prop-types": "off",
          "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],
        },
      },
    );
  }

  // ignores (always last)
  configs.push({
    ignores: ["dist", "node_modules", "src/__localization__"],
  });

  return ts.config(...configs);
};
