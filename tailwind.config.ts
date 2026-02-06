import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "slow-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        drift: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        pulsegrid: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "slow-spin": "slow-spin 28s linear infinite",
        drift: "drift 8s ease-in-out infinite",
        pulsegrid: "pulsegrid 3s ease-in-out infinite",
      },
      boxShadow: {
        glow: "0 0 40px rgba(255, 255, 255, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
