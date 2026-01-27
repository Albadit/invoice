import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    // Apply to all JS/TS source files
    files: ["**/*.{js,jsx,ts,tsx}"],

    plugins: {
      boundaries,
    },

    settings: {
      "boundaries/include": ["**/*"],
      
      "boundaries/elements": [
        // 1. Shared layer - Bottom of the hierarchy
        // Reusable, domain-agnostic building blocks
        {
          mode: "full",
          type: "shared",
          pattern: [
            "components/**/*",
            "lib/**/*",
            "utils/**/*",
            "contexts/**/*",
            "config/**/*",
            "styles/**/*",
            "public/**/*",
          ]
        },
        
        // 2. Feature layer - Middle of the hierarchy
        // Domain-specific business logic and UI
        {
          mode: "full",
          type: "feature",
          capture: ["featureName"],
          pattern: ["features/*/**/*"]
        },
        
        // 3. App layer - Top of the hierarchy
        // Handles routing, layouts, and page composition
        {
          mode: "full",
          type: "app",
          pattern: ["app/**/*"]
        }
      ],

      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },

    rules: {
      // Detect files that don't match any element pattern
      "boundaries/no-unknown": ["error"],
      
      // Enforce that all files must belong to a known element type
      "boundaries/no-unknown-files": ["error"],
      
      // Enforce architectural boundaries
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            // Shared: Bottom layer - can only import from other shared modules
            {
              from: ["shared"],
              allow: ["shared"],
              message: "Shared modules can only import from other shared modules. Cannot import from app or features."
            },
            
            // Feature: Middle layer - can import shared + same feature only
            {
              from: ["feature"],
              allow: [
                "shared",
                ["feature", { "featureName": "${from.featureName}" }]
              ],
              message: "Features can only import from shared modules or their own feature. Cross-feature imports are not allowed."
            },
            
            // App: Top layer - can import shared and features
            {
              from: ["app"],
              allow: ["shared", "feature", "app"],
              message: "App layer can import from shared modules, features, and other app files."
            }
          ]
        }
      ]
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts and config files (not part of app architecture)
    "scripts/**",
    "*.config.ts",
    "*.config.mjs",
    "*.config.js",
  ]),
]);

export default eslintConfig;
