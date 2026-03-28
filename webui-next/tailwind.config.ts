import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#10a37f",
          hover: "#0d8a6a",
          light: "rgba(16, 163, 127, 0.1)",
          dark: "#0a7d5e",
        },
      },
      fontFamily: {
        mono: ["SF Mono", "Monaco", "Inconsolata", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
