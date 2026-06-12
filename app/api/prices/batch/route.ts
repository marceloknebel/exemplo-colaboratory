import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { items, city } = await request.json();

  if (!Array.isArray(items) || !city) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const created = await prisma.$transaction(
    items.map((item: { productName: string; price: number; note?: string }) =>
      prisma.priceEntry.create({
        data: {
          productName: item.productName.trim().toLowerCase(),
          price: parseFloat(String(item.price)),
          city,
          note: item.note || null,
        },
      })
    )
  );

  return NextResponse.json({ saved: created.length }, { status: 201 });
}
