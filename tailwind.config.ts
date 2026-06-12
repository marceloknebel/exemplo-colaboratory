import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        poa: {
          DEFAULT: "#3b82f6",
          light: "#eff6ff",
        },
        campobom: {
          DEFAULT: "#8b5cf6",
          light: "#f5f3ff",
        },
      },
    },
  },
  plugins: [],
};

export default config;
