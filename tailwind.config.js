/** @type {import('tailwindcss').Config} */
export default {
  // 1. Resolve o conflito de prioridade:
  // Isso faz com que todas as classes do Tailwind tenham !important por padrão,
  // vencendo as regras do seu index.css sem precisar de colchetes.
  important: true, 

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 2. Registramos suas cores aqui para não precisar de [ ] no HTML
      colors: {
        'teste-erro': '#ff0000', // Exemplo de cor personalizada
        brand: {
          dark: "#0b1220",      // A cor do seu sidebar/bg
          primary: "#1e3a8a",   // blue-primary do seu CSS
          mid: "#2563eb",       // blue-mid do seu CSS
          light: "#38bdf8",     // blue-light do seu CSS
        },
        surface: "#f8fafc",     // A cor de fundo --bg
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
        ],
      },
    },
  },
  plugins: [],
}