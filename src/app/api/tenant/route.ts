import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { ownerId: userId },
    include: {
      bankAccounts: true,
      cards: true,
    },
  });

  return NextResponse.json({ tenant });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, userId } = body ?? {};

  if (!name || !userId) {
    return NextResponse.json(
      { error: "name and userId are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.tenant.findUnique({ where: { ownerId: userId } });
  if (existing) {
    return NextResponse.json({ tenant: existing });
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      ownerId: userId,
    },
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
