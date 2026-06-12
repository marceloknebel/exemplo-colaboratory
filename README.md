# Comparador de Preços 🛒

App para comparar preços de produtos entre **Porto Alegre** e **Campo Bom**.

Tire uma foto da etiqueta ou embalagem, a IA extrai o produto e o preço automaticamente, e o app mostra a comparação lado a lado.

## Como usar

### 1. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Caminho do banco SQLite: `file:./dev.db` |
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic ([console.anthropic.com](https://console.anthropic.com)) |
| `APP_PASSWORD` | Senha compartilhada para entrar no app |
| `NEXTAUTH_SECRET` | String aleatória para assinar sessões (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL do app (ex: `http://localhost:3000`) |

### 2. Instalar dependências e criar banco

```bash
npm install
npm run db:push
```

### 3. Rodar em desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Faça push para o GitHub
2. Importe no [vercel.com](https://vercel.com)
3. Configure as variáveis de ambiente no painel da Vercel
4. Para `DATABASE_URL` em produção, use [Vercel Postgres](https://vercel.com/storage/postgres) ou [Neon](https://neon.tech) e troque o provider para `postgresql` no `prisma/schema.prisma`

## Funcionalidades

- 📷 Foto direto da câmera do celular
- 🤖 IA (Claude) extrai nome e preço automaticamente
- 🏙️ Comparação Porto Alegre vs Campo Bom
- 💚 Mostra qual cidade está mais barata e o % de diferença
- 🔐 Login com senha compartilhada
- 📱 PWA — pode instalar na tela inicial do celular
