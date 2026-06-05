import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Map navy to cream theme for backward compatibility
        navy: {
          900: '#FAF7F2', // Surface background
          850: '#F2ECE2', // Light cream background
          800: '#ffffff', // Card background
          700: '#E6E1DA', // Border
          600: '#C7BFB5', // Beige-gray
          500: '#9C9284', // Muted text
        },
        gray: {
          950: '#000000',
          900: '#111111',
          800: '#222222',
          700: '#333333',
          650: '#4A453D',
          600: '#5A544A',
          500: '#6B6459',
          450: '#847B6F',
          400: '#9C9284',
          300: '#C7BFB5',
          200: '#E6E1DA',
          100: '#F2ECE2',
          50: '#FAF7F2',
        },
        success: {
          DEFAULT: '#10b981',
          bg: '#ecfdf5',
          border: '#a7f3d0',
        },
        warning: {
          DEFAULT: '#f59e0b',
          bg: '#fffbeb',
          border: '#fde68a',
        },
        error: {
          DEFAULT: '#ef4444',
          bg: '#fef2f2',
          border: '#fecaca',
        },
        info: {
          DEFAULT: '#0ea5e9',
          bg: '#f0f9ff',
          border: '#bae6fd',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          bg: '#f5f3ff',
          border: '#ddd6fe',
        },
        orange: {
          DEFAULT: '#f97316',
          bg: '#fff7ed',
          border: '#ffedd5',
        },
        clinical: {
          blue: '#111111', // Black primary
          'blue-light': '#6B6459', // Secondary warm gray
          green: '#10b981',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      }
    }
  },
  plugins: [],
} satisfies Config

