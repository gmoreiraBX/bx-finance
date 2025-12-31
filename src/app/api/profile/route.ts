import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, fullName, phone, document, company, timezone } = body ?? {};

  if (!userId) {
    return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
  }

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: {
      fullName,
      phone,
      document,
      company,
      timezone,
    },
    create: {
      userId,
      fullName,
      phone,
      document,
      company,
      timezone,
    },
  });

  return NextResponse.json({ profile });
}
