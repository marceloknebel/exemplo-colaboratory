# Comparador de Preços 🛒

App para comparar preços de produtos entre **Porto Alegre** e **Campo Bom**.

Tire uma foto da etiqueta ou embalagem, a IA extrai o produto e o preço automaticamente, e o app mostra a comparação lado a lado.

---

## 🚀 Publicar o app (para usar no celular)

Siga os 3 passos abaixo. Não precisa instalar nada no computador.

### Passo 1 — Chave da IA (Anthropic)

1. Acesse [console.anthropic.com](https://console.anthropic.com) e crie uma conta
2. Adicione um cartão de crédito (uso é barato — centavos por foto)
3. Vá em **API Keys → Create Key**, copie a chave (começa com `sk-ant-...`)

### Passo 2 — Banco de dados (Neon)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta (gratuito)
2. Crie um projeto com qualquer nome
3. Copie a **Connection String** (começa com `postgresql://...`)

### Passo 3 — Publicar (Vercel)

1. Acesse [vercel.com](https://vercel.com) e entre com sua conta do **GitHub**
2. Clique em **Add New Project** → importe o repositório `exemplo-colaboratory`
3. Antes de clicar em Deploy, adicione as **Environment Variables**:

| Variável | O que colocar |
|---|---|
| `DATABASE_URL` | A string do Neon copiada no Passo 2 |
| `ANTHROPIC_API_KEY` | A chave copiada no Passo 1 |
| `APP_PASSWORD` | Uma senha para você e sua namorada usarem |
| `NEXTAUTH_SECRET` | Acesse [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32) e cole o resultado |

4. Clique em **Deploy** e aguarde ~2 minutos
5. Pronto! Você receberá uma URL para abrir no celular

---

## Funcionalidades

- 📷 Foto direto da câmera do celular
- 🤖 IA (Claude Haiku) extrai nome e preço automaticamente
- 🏙️ Comparação Porto Alegre vs Campo Bom
- 💚 Mostra qual cidade está mais barata e o % de diferença
- 🔐 Login com senha compartilhada
- 📱 PWA — pode instalar na tela inicial do celular

---

## Para desenvolvedores — rodar localmente

<details>
<summary>Expandir instruções técnicas</summary>

### Pré-requisitos
- Node.js 18+
- PostgreSQL (ou use SQLite trocando o provider no schema.prisma)

### Configurar

```bash
cp .env.example .env.local
# Preencha as variáveis no .env.local
npm install
npm run db:push
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

</details>
