import type { Config } from "tailwindcss";
import { heroui } from "@heroui/theme";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colorMix: {
        colorSpace: "srgb",
      },
    },
  },
  plugins: [heroui()],
};

export default config;
