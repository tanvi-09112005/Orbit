import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-mid': 'var(--primary-mid)',
        'primary-light': 'var(--primary-light)',
        teal: 'var(--teal)',
        'teal-light': 'var(--teal-light)',
        coral: 'var(--coral)',
        'coral-light': 'var(--coral-light)',
        amber: 'var(--amber)',
        'amber-light': 'var(--amber-light)',
        surface: 'var(--surface)',
        muted: 'var(--muted)',
        'text-secondary': 'var(--text-secondary)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
        mono: ['Menlo', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      fontSize: {
        display: ['32px', { lineHeight: '40px', fontWeight: '700' }],
        h1: ['24px', { lineHeight: '32px', fontWeight: '700' }],
        h2: ['18px', { lineHeight: '24px', fontWeight: '600' }],
        h3: ['15px', { lineHeight: '20px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '400' }],
        label: ['11px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.05em' }],
      },
      minHeight: {
        'touch-target': '44px',
      },
      minWidth: {
        'touch-target': '44px',
      },
    },
  },
  plugins: [],
} satisfies Config
