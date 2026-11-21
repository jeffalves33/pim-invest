import type { Config } from 'tailwindcss'

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        surface2: v('surface2'),
        line: v('line'),
        ink: v('ink'),
        ink2: v('ink2'),
        ink3: v('ink3'),
        accent: v('accent'),
        ok: v('ok'),
        warn: v('warn'),
        bad: v('bad'),
        info: v('info'),
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
      fontSize: { '2xs': ['11px', '14px'] },
    },
  },
  plugins: [],
} satisfies Config
