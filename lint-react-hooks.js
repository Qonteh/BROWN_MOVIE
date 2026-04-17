const { ESLint } = require('eslint');
const tsParser = require('@typescript-eslint/parser');
const reactHooks = require('eslint-plugin-react-hooks');

(async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: {
      files: ['**/*.{js,jsx,ts,tsx}'],
      ignores: ['node_modules/**', '.next/**'],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
      },
      plugins: { 'react-hooks': reactHooks },
      rules: reactHooks.configs.recommended.rules,
    },
  });

  const results = await eslint.lintFiles([
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
  ]);

  for (const r of results) {
    for (const m of r.messages) {
      if (m.ruleId && m.ruleId.startsWith('react-hooks')) {
        console.log(`${r.filePath}:${m.line}:${m.column} ${m.ruleId} ${m.message}`);
      }
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
