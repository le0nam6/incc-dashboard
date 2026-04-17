import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      colors: {
        blue: {
          50: "#E6F1FB",
          600: "#378ADD",
          800: "#185FA5",
          900: "#0C447C",
        },
        green: {
          50: "#EAF3DE",
          600: "#1D9E75",
          800: "#0F6E56",
          900: "#3B6D11",
        },
        amber: {
          50: "#FAEEDA",
          600: "#BA7517",
          900: "#633806",
        },
        purple: {
          50: "#EEEDFE",
          500: "#7F77DD",
          900: "#3C3489",
        },
        red: {
          50: "#FCEBEB",
          900: "#791F1F",
        },
      },
    },
  },
  plugins: [],
};

export default config;
