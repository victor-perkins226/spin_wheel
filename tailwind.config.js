module.exports = {
  darkMode: 'class', // <- important
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    // add others as needed
  ],
  theme: {
    extend: {
      keyframes: {
        zoomInOut: {
          '0%,100%': { transform: 'scale(0.95)' },
          '50%':     { transform: 'scale(1.15)' },
        },
      },
      animation: {
        zoom: 'zoomInOut 1.2s ease-in-out infinite',
      },
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
