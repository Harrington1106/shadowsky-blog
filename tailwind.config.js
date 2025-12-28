/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}", "./js/**/*.js", "./src/**/*.{js,ts}", "./admin/**/*.{html,js}"],
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
                maxWidth: 'none',
                color: theme('colors.gray.800'),
                fontFamily: theme('fontFamily.sans'),
                fontSize: '1rem', 
                '@screen sm': {
                    fontSize: '1.125rem',
                },
                lineHeight: '1.75',
                letterSpacing: '0.025em',
                p: {
                    marginTop: '1.25em',
                    marginBottom: '1.25em',
                    textAlign: 'justify',
                },
                'h1, h2, h3, h4': {
                    fontFamily: theme('fontFamily.sans'),
                    fontWeight: '700',
                    letterSpacing: '0.025em',
                    marginTop: '2em',
                    marginBottom: '1em',
                    lineHeight: '1.3',
                },
                h1: { 
                    fontSize: '1.875rem',
                    '@screen sm': { fontSize: '2.5rem' }
                },
                h2: { 
                    fontSize: '1.5rem',
                    '@screen sm': { fontSize: '2rem' }
                },
                h3: { 
                    fontSize: '1.25rem',
                    '@screen sm': { fontSize: '1.75rem' }
                },
                a: {
                    color: theme('colors.blue.600'),
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    '&:hover': {
                        color: theme('colors.blue.800'),
                        textDecoration: 'underline',
                    },
                },
                code: {
                    color: theme('colors.pink.600'),
                    backgroundColor: theme('colors.gray.100'),
                    padding: '0.25rem 0.4rem',
                    borderRadius: '0.25rem',
                    fontWeight: '600',
                    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                },
                'code::before': { content: '""' },
                'code::after': { content: '""' },
                blockquote: {
                    fontStyle: 'normal',
                    borderLeftColor: theme('colors.blue.500'),
                    backgroundColor: theme('colors.blue.50'),
                    color: theme('colors.gray.700'),
                    padding: '1rem',
                    borderRadius: '0.5rem',
                },
            },
        },
        invert: {
            css: {
                color: theme('colors.gray.200'), // Softer white
                a: {
                    color: theme('colors.blue.400'),
                    '&:hover': {
                        color: theme('colors.blue.300'),
                    },
                },
                h1: { color: theme('colors.gray.100') },
                h2: { color: theme('colors.gray.100') },
                h3: { color: theme('colors.gray.100') },
                h4: { color: theme('colors.gray.100') },
                strong: { color: theme('colors.white') },
                code: { 
                    color: theme('colors.pink.400'),
                    backgroundColor: theme('colors.gray.800'),
                },
                blockquote: { 
                    color: theme('colors.gray.300'),
                    backgroundColor: 'rgba(30, 41, 59, 0.5)', // Slate-800 with opacity
                    borderLeftColor: theme('colors.blue.400'),
                },
            },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
