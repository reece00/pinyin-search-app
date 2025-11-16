/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/index.html',
    './public/assets/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        secondary: '#6B7280',
        accent: '#FF9500',
        light: '#F9FAFB',
        dark: '#1F2937',
        warning: '#FFC107',
        success: '#28A745'
      },
      fontFamily: {
        sans: ['汉字拼音体', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        popup: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        button: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }
    }
  },
  safelist: [
    'hidden', 'truncate', 'resize-none',
    { pattern: /bg-(gray|blue|red)-(50|100|200|600)/ },
    { pattern: /text-(gray|blue)-(400|500|600)/ },
    { pattern: /shadow-(sm|lg)/ },
    { pattern: /rounded-(lg|full)/ },
    { pattern: /z-(10|20|30|50)/ },
    'min-w-[72px]',
    'max-h-[80vh]'
  ]
};
