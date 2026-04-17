# ABA Seguros CRM

Este projeto é um painel inteligente para gestão de clientes, financeiro, marketing e mensagens, desenvolvido com **React**, **TypeScript**, **Vite** e **Tailwind CSS**.

## Tecnologias Utilizadas

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide React Icons](https://lucide.dev/)
- ESLint e plugins para qualidade de código

## Funcionalidades

- Sidebar responsiva com navegação entre módulos:
  - Painel
  - Clientes
  - Financeiro
  - Marketing & Relacionamento
  - Mensagens
- Layout moderno e responsivo
- Temas e cores customizáveis via Tailwind
- Código organizado em componentes reutilizáveis

## Como rodar o projeto

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/aba-crm.git
   cd aba-crm/aba_seguros
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. Acesse [http://localhost:5173](http://localhost:5173) no navegador.

## Estrutura de Pastas

```
src/
  components/      # Componentes reutilizáveis (Sidebar, etc)
  routes/          # Definição das rotas da aplicação
  index.css        # Estilos globais e Tailwind
  main.tsx         # Ponto de entrada da aplicação
  ...
```

## Customização de Estilos

- Utilize as classes utilitárias do Tailwind diretamente nos componentes.
- Para cores customizadas, utilize a sintaxe entre colchetes, ex: `bg-[#0b1220]`.
- Evite sobrescrever estilos globais no CSS para garantir que o Tailwind funcione corretamente em cada componente.

## Observações

- Certifique-se de estar usando a versão correta do Tailwind CSS (preferencialmente v3 ou superior).
- Para adicionar novas páginas ou módulos, crie novos componentes em `src/components` e adicione as rotas em `src/routes`.

---

 
Desenvolvido por Equipe ABA Seguros.