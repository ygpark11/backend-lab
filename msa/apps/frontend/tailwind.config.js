/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            transitionDuration: {
                '500': '500ms',
                '600': '600ms',
                '800': '800ms',
            },
            transitionTimingFunction: {
                'pioneer': 'cubic-bezier(0.25, 1, 0.5, 1)',
            },
            colors: {
                surface: 'var(--color-bg-surface)',
                'surface-hover': 'var(--color-bg-surface-hover)',
                glass: 'var(--color-bg-glass)',
                primary: 'var(--color-text-primary)',
                secondary: 'var(--color-text-secondary)',
                muted: 'var(--color-text-muted)',
                divider: 'var(--color-border-default)',
                'divider-strong': 'var(--color-border-strong)',

                ps: {
                    blue: 'var(--color-brand-blue)',
                    black: 'var(--color-bg-base)',
                    card: 'var(--color-bg-surface)',
                    hover: 'var(--color-bg-surface-hover)',
                    text: 'var(--color-text-primary)',
                    muted: 'var(--color-text-muted)'
                },

                score: {
                    green: {
                        bg: 'var(--color-score-green-bg)',
                        text: 'var(--color-score-green-text)'
                    },
                    yellow: {
                        bg: 'var(--color-score-yellow-bg)',
                        text: 'var(--color-score-yellow-text)'
                    }
                }
            },

            backgroundColor: {
                base: 'var(--color-bg-base)',
                backdrop: 'var(--color-backdrop)',
            },

            boxShadow: {
                'glow': 'var(--shadow-glow)',
                'glow-blue': 'var(--shadow-glow-blue)',
            },

            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            keyframes: {
                scan: {
                    '0%': { top: '-150%' },
                    '100%': { top: '150%' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeOut: {
                    '0%': { opacity: '1' },
                    '100%': { opacity: '0' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                shimmer: {
                    '100%': { transform: 'translateX(100%)' },
                }
            },
            animation: {
                'spin-slow': 'spin 10s linear infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 2s infinite',
                'fadeIn': 'fadeIn 0.3s ease-out forwards',
                'fadeOut': 'fadeOut 0.3s ease-in forwards',
                'slideDown': 'slideDown 0.4s ease-out forwards',
            }
        },
    },
    plugins: [
        require("tailwindcss-animate")
    ],
}