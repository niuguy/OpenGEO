import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        muted: "#5c6975",
        line: "#d9e0e7",
        panel: "#f7f9fb",
        accent: "#0f766e"
      }
    }
  },
  plugins: []
};

export default config;
