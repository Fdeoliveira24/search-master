import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintPluginImport from "eslint-plugin-import";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.browser,
        Fuse: "readonly",
        searchContainer: "readonly",
        _isMobileView: "readonly",
        getSchemaVersion: "readonly",
        highlightMatches: "readonly",
        prepareFuse: "readonly",
      },
    },
    plugins: {
      prettier: eslintPluginPrettier,
      import: eslintPluginImport,
    },
    extends: [js.configs.recommended, prettier],
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-empty": "warn",
      "no-dupe-class-members": "error",
      "no-case-declarations": "error",
      "prettier/prettier": "error",
      "import/no-default-export": "error",
      "import/no-named-as-default": "error",
      "import/named": "error",
      "import/namespace": "error",
      "import/default": "error",
      "import/export": "error",
      "import/first": "error",
      "import/exports-last": "error",
      "import/no-duplicates": "error",
      "import/no-mutable-exports": "error",
      "import/no-unresolved": "error",
    },
  },
]);
