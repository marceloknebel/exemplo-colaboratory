import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const entries = await prisma.priceEntry.findMany({
    orderBy: { capturedAt: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const { productName, price, city, note } = body;

  if (!productName || !price || !city) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const entry = await prisma.priceEntry.create({
    data: {
      productName: productName.trim().toLowerCase(),
      price: parseFloat(price),
      city,
      note: note || null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
