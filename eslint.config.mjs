import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: ['.next/**', 'node_modules/**', 'generated/**'],
  },
  {
    files: ['widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@app/*', '@pages/*'] }],
    },
  },
  {
    files: ['features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@app/*', '@pages/*', '@widgets/*'] }],
    },
  },
  {
    files: ['entities/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['@app/*', '@pages/*', '@widgets/*', '@features/*'] },
      ],
    },
  },
  {
    files: ['shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['@app/*', '@pages/*', '@widgets/*', '@features/*', '@entities/*'] },
      ],
    },
  },
]

export default eslintConfig
