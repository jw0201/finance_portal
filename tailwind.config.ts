import type { Config } from 'tailwindcss';

/**
 * 50~70대 사용자를 우선한 스케일.
 * 본문 기본값을 18px로 올리고, 터치 영역 최소 크기를 토큰으로 관리한다.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontSize: {
        base: ['1.125rem', { lineHeight: '1.75rem' }],
        lg: ['1.25rem', { lineHeight: '1.875rem' }],
        xl: ['1.5rem', { lineHeight: '2rem' }],
        '2xl': ['1.875rem', { lineHeight: '2.375rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.75rem' }],
        '4xl': ['3rem', { lineHeight: '3.25rem' }],
      },
      minHeight: {
        touch: '3.5rem',
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
        },
        caution: {
          50: '#fef2f2',
          600: '#dc2626',
          700: '#b91c1c',
        },
        good: {
          50: '#f0fdf4',
          600: '#16a34a',
          700: '#15803d',
        },
      },
    },
  },
  plugins: [],
};

export default config;
