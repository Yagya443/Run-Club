export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { paper: '#F8F5EE', forest: { DEFAULT: '#2E5B3F', dark: '#1F4030' }, sage: { DEFAULT: '#B4C5A8', light: '#E3EBDC' },
      ember: '#CF8A3C', sun: '#EFC558', ink: '#252B27', stone: '#6B706A', line: '#E4DFD3' },
    fontFamily: { display: ['Bricolage Grotesque', 'ui-sans-serif', 'system-ui', 'sans-serif'], sans: ['Instrument Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
  } },
  plugins: [],
};
