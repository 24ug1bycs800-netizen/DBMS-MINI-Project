/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#D4AF37",
        primaryHover: "#F4D03F",

        background: "#0F1115",
        surface: "#1A1D24",
        card: "#222733",

        text: "#FFFFFF",
        muted: "#A1A1AA",

        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        inter:   ["Poppins", "sans-serif"],
      },
      boxShadow: {
        premium: "0 8px 32px 0 rgba(0, 0, 0, 0.5)",
        glow: "0 0 15px rgba(229, 9, 20, 0.4)",
      },
    },
  },
  plugins: [],
};
