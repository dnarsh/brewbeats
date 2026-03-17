import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        espresso: '#1a1210',
        roast: '#2a1f1a',
        'roast-light': '#3a2d25',
        caramel: '#c8956c',
        cream: '#e8c5a0',
        gold: '#e8c06c',
        dusk: '#7a4a6b',
        'dusk-light': '#9b6b8a',
        'warm-white': '#f0e6dc',
        'warm-dim': '#b0a090',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
