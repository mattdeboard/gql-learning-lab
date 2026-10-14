import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

// The project-specific rule: a subgraph may import from shared/ (as @lab/shared/...)
// but never from another subgraph. Each subgraph gets its own config block
// listing every *other* subgraph as off-limits.

const subgraphNames = readdirSync(join(import.meta.dirname, 'subgraphs'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const subgraphBoundaries = subgraphNames.map((name) => ({
  files: [`subgraphs/${name}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '**/subgraphs/**',
              '@lab/*',
              '!@lab/shared',
              ...subgraphNames.filter((other) => other !== name).map((other) => `../../${other}/**`),
            ],
            message: `The ${name} subgraph may only import from @lab/shared, not from another subgraph.`,
          },
        ],
      },
    ],
  },
}));

export default tseslint.config(
  { ignores: ['**/node_modules/**'] },

  // Bug-catching rules, using type information from tsconfig.json
  // (floating promises, unsafe `any`, async functions passed where sync is expected...).
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  // Plain JS files (this config) aren't in tsconfig.json, so no type-aware rules for them.
  { files: ['**/*.js'], ...tseslint.configs.disableTypeChecked },
  {
    rules: {
      // Apollo's APIs (plugin hooks, context functions) require async functions even
      // when there's nothing to await, so this rule would only produce noise.
      '@typescript-eslint/require-await': 'off',

      // Names starting with _ (or just _) are deliberately unused, e.g. the
      // (_parent, _args, context) resolver arguments you have to accept positionally.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },

  ...subgraphBoundaries,

  // Last: turn off every rule that's about formatting. Prettier owns that.
  prettier,
);
