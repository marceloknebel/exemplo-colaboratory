import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const PRODUCT_PROMPT = `Você é um assistente de supermercado. Analise esta imagem (etiqueta de preço, embalagem ou prateleira).

Extraia o nome do produto e o preço em reais.
Responda SOMENTE com JSON válido, sem texto adicional:
{"produto": "nome do produto", "preco": 0.00}

Se não conseguir identificar, retorne: {"produto": "", "preco": 0}`;

const RECEIPT_PROMPT = `Você é um assistente especializado em leitura de notas fiscais brasileiras.

Analise esta nota fiscal e extraia TODOS os itens/produtos comprados.
Para cada item identifique: nome do produto e preço unitário (não o total do item).

Responda SOMENTE com JSON válido, sem texto adicional, neste formato exato:
{
  "produtos": [
    {"nome": "Nome do Produto", "preco": 0.00, "quantidade": 1},
    {"nome": "Outro Produto", "preco": 0.00, "quantidade": 2}
  ]
}

Regras:
- Use o preço unitário de cada item
- Normalize os nomes (remova códigos, abreviações excessivas)
- Se um item estiver ilegível, pule-o
- Se não for uma nota fiscal, retorne: {"produtos": []}`;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { imageBase64, mediaType = "image/jpeg", mode = "product" } = await request.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "Imagem não fornecida" }, { status: 400 });
  }

  const isReceipt = mode === "receipt";

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: isReceipt ? 2048 : 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: isReceipt ? RECEIPT_PROMPT : PRODUCT_PROMPT,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json(isReceipt ? { produtos: [] } : { produto: "", preco: 0 });
  }

  try {
    const cleaned = content.text.replace(/```json\n?|\n?```/g, "").trim();
    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(isReceipt ? { produtos: [] } : { produto: "", preco: 0 });
  }
}
