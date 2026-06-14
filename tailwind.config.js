/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Low-saturation team colors (spec §22: 不使用过重的大面积红蓝色块).
        blue: { team: '#5b7db1', teamSoft: '#e7eef7', teamBright: '#3f6bb0' },
        red: { team: '#c07a7a', teamSoft: '#f7eaea', teamBright: '#b85656' },
        felt: '#2f7d57',
      },
    },
  },
  plugins: [],
}
