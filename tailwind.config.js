module.exports = {
  darkMode: 'class', // <- important
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    // add others as needed
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // add others as needed
        card: 'hsl(var(--card))',
        sidebar: 'hsl(var(--sidebar-background))',
      }
    }
  },
  plugins: [
     require('@tailwindcss/aspect-ratio'),
  ],
};
