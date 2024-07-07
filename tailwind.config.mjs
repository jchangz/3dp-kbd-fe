/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["t26-carbon", "monospace"],
        sans: ["neue-haas-grotesk-display", "sans-serif"],
      },
    },
  },
  plugins: [],
};
