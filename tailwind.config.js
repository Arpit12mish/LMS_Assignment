/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./features/**/*.{js,jsx,ts,tsx}", "./design-system/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        primaryDeep: "#1D4ED8",
        navy: "#0B1221",
        ink: "#0F172A",
        slate: "#64748B",
        softBlue: "#EFF6FF",
        canvas: "#F8FAFC",
        border: "#E2E8F0",
        success: "#16A34A",
        warning: "#F59E0B",
        error: "#DC2626",
      },
      borderRadius: {
        card: "18px",
        control: "14px",
        tile: "12px",
      },
      boxShadow: {
        card: "0 4px 16px rgba(15, 23, 42, 0.05)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
