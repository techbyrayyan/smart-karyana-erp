/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kiryana: {
          darkGreen: "#123D2B",
          freshGreen: "#159957",
          lightGreen: "#E9F5ED",
          softBg: "#F6F8F6",
          darkText: "#17231C",
          warning: "#E6A23C",
          error: "#DC4545",
          border: "#DDE7E1",
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        urdu: ['var(--font-urdu)', "'Noto Nastaliq Urdu'", "'Jameel Noori Nastaleeq'", "'Urdu Typesetting'", 'sans-serif'],
      },
      boxShadow: {
        'mobile-nav': '0 -2px 10px rgba(18, 61, 43, 0.08)',
        'card-soft': '0 2px 8px rgba(18, 61, 43, 0.04), 0 1px 2px rgba(18, 61, 43, 0.06)',
      }
    },
  },
  plugins: [],
};
