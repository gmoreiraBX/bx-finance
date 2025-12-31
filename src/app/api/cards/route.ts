import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required" },
      { status: 400 }
    );
  }

  const cards = await prisma.card.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ cards });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { tenantId, nickname } = body ?? {};

  if (!tenantId || !nickname) {
    return NextResponse.json(
      { error: "tenantId and nickname are required" },
      { status: 400 }
    );
  }

  const card = await prisma.card.create({
    data: { tenantId, nickname },
  });

  return NextResponse.json({ card }, { status: 201 });
}
