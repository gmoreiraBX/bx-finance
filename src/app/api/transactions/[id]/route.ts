import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const body = await request.json();
  const {
    amount,
    type,
    category,
    bankAccountId,
    cardId,
    isFixed,
    referenceMonth,
  } = body ?? {};

  if (!amount || !type || !category) {
    return NextResponse.json(
      { error: "amount, type e category são obrigatórios" },
      { status: 400 }
    );
  }

  if (bankAccountId && cardId) {
    return NextResponse.json(
      { error: "Escolha apenas conta OU cartão" },
      { status: 400 }
    );
  }
  if (!bankAccountId && !cardId) {
    return NextResponse.json(
      { error: "Associe a transação a uma conta ou cartão" },
      { status: 400 }
    );
  }

  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json(
      { error: "amount precisa ser um número maior que zero" },
      { status: 400 }
    );
  }

  if (!["INCOME", "EXPENSE"].includes(type)) {
    return NextResponse.json(
      { error: "type deve ser INCOME ou EXPENSE" },
      { status: 400 }
    );
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      amount: parsedAmount,
      type,
      category,
      bankAccountId: bankAccountId || null,
      cardId: cardId || null,
      isFixed: !!isFixed,
      referenceMonth: referenceMonth
        ? new Date(`${referenceMonth}-01T00:00:00.000Z`)
        : null,
    },
  });

  return NextResponse.json({ transaction: updated });
}
