/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}", "./js/**/*.js", "./src/**/*.{js,ts}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        serif: ['"Noto Serif SC"', 'serif'],
        cute: ['"ZCOOL KuaiLe"', 'cursive'],
      },
      colors: {
        slate: {
            950: '#020617',
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in-up-delay': 'fadeInUp 0.8s ease-out 0.5s forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      typography: (theme) => ({
        DEFAULT: {
            css: {
                color: theme('colors.gray.700'),
                h1: { fontFamily: theme('fontFamily.serif') },
                h2: { fontFamily: theme('fontFamily.serif'), marginTop: '2em' },
                h3: { fontFamily: theme('fontFamily.serif') },
                p: { lineHeight: '1.8' },
            },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}