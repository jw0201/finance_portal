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
        '5xl': ['3.75rem', { lineHeight: '4rem' }],
      },
      minHeight: {
        touch: '3.5rem',
      },
      maxWidth: {
        /** 전체 화면을 쓰는 바깥 껍데기. 넓은 화면에서도 좌우가 비지 않게 한다. */
        shell: '110rem',
        /** 본문 글줄. 넓어도 한 줄이 길어지지 않게 제한한다. */
        prose: '70ch',
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
          950: '#0b1220',
        },
        caution: {
          50: '#fef2f2',
          100: '#fee2e2',
          600: '#dc2626',
          700: '#b91c1c',
        },
        good: {
          50: '#f0fdf4',
          100: '#dcfce7',
          600: '#16a34a',
          700: '#15803d',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.12)',
        'card-hover':
          '0 1px 2px 0 rgb(15 23 42 / 0.05), 0 16px 36px -16px rgb(15 23 42 / 0.22)',
      },
    },
  },
  plugins: [],
};

export default config;
