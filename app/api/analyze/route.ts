import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { imageBase64, mediaType = "image/jpeg" } = await request.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "Imagem não fornecida" }, { status: 400 });
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
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
            text: `Você é um assistente de supermercado. Analise esta imagem (pode ser uma etiqueta de preço, embalagem de produto ou prateleira de mercado).

Extraia:
1. Nome do produto (seja específico: marca, quantidade, etc.)
2. Preço em reais

Responda SOMENTE com JSON válido, sem texto adicional:
{"produto": "nome do produto", "preco": 0.00}

Se não conseguir identificar, retorne: {"produto": "", "preco": 0}`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ produto: "", preco: 0 });
  }

  try {
    const cleaned = content.text.replace(/```json\n?|\n?```/g, "").trim();
    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ produto: "", preco: 0 });
  }
}
