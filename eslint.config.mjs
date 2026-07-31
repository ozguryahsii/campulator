import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/coverage/**',
      'apps/api/prisma/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // Kasıtlı olarak esnek: Prisma/Nest tiplerinde any köprüleri gerekebiliyor
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Seed ve script dosyalarında konsol çıktısı normal
    files: ['**/prisma/seed.ts', '**/scripts/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // CommonJS yapılandırma dosyaları (jest/babel) Node ortamında çalışır
    files: ['**/*.config.js', '**/babel.config.js', '**/jest.config.js'],
    languageOptions: { globals: { module: 'writable', require: 'readonly' } },
  },
  {
    // Next.js üretilen tip referansı dosyası
    files: ['**/next-env.d.ts'],
    rules: { '@typescript-eslint/triple-slash-reference': 'off' },
  },
);
