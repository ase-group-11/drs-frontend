// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   content: ["./src/**/*.{js,jsx,ts,tsx}"],
//   theme: {
//     extend: {
//       colors: tailwindTheme.colors,
//     },
//   },
//   plugins: [],
// };

module.exports = {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2cd7f5",
        primaryDark: "#22c3df",
        gray100: "#f4f4f5",
        gray300: "#d4d4d8",
        textDark: "#1f2937",
        danger: "#ef4444",
        dangerDark: "#dc2626",
      },
    },
  },
  plugins: [],
};
