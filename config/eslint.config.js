// ESLint v9 flat config
import pluginImport from 'eslint-plugin-import';

export default [
  {
    ignores: ['node_modules/**', 'public/pinyin-pro.js', 'public/js/pinyin-pro.js', 'public/**/*.min.js']
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        ResizeObserver: 'readonly',
        localStorage: 'readonly',
        requestAnimationFrame: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        getComputedStyle: 'readonly',
        fetch: 'readonly',
        btoa: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        URL: 'readonly',
        Response: 'readonly'
      }
    },
    plugins: {
      import: pluginImport
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'import/no-unresolved': ['error', { ignore: ['^/'] }],
      'import/named': 'error'
    }
  },
  {
    files: ['public/js/features.js'],
    rules: {
      'import/no-unresolved': 'off'
    }
  },
  {
    files: ['public/service-worker.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      'import/no-unresolved': 'off',
      'import/named': 'off'
    }
  },
  {
    files: ['scripts/server.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      'import/no-unresolved': 'off',
      'import/named': 'off'
    }
  }
];
