/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Aptos', '"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Mono"', '"Cascadia Code"', '"SFMono-Regular"', 'Consolas', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};
