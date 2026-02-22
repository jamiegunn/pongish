import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";

const tsFiles = ["**/*.ts", "**/*.tsx"];
const featureGlob = "src/features/*";

export default [
  {
    files: tsFiles,
    ignores: ["dist/**", "node_modules/**", "plans/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.app.json"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin
    },
    settings: {
      "import/resolver": {
        typescript: true
      }
    },
    rules: {
      "import/no-default-export": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports"
        }
      ]
    }
  },
  {
    files: [`${featureGlob}/domain/**/*.ts`, `${featureGlob}/domain/**/*.tsx`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/application/**",
            "**/interface-adapters/**",
            "**/frameworks-drivers/**"
          ]
        }
      ]
    }
  },
  {
    files: [
      `${featureGlob}/application/**/*.ts`,
      `${featureGlob}/application/**/*.tsx`
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["**/interface-adapters/**", "**/frameworks-drivers/**"]
        }
      ]
    }
  },
  {
    files: [
      `${featureGlob}/interface-adapters/**/*.ts`,
      `${featureGlob}/interface-adapters/**/*.tsx`
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["**/frameworks-drivers/**"]
        }
      ]
    }
  }
];
