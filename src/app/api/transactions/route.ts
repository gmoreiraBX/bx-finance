import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    tenantId,
    bankAccountId,
    cardId,
    amount,
    type,
    category,
    isFixed,
    referenceMonth,
  } = body ?? {};

  if (!tenantId || !amount || !type) {
    return NextResponse.json(
      { error: "tenantId, amount e type são obrigatórios" },
      { status: 400 }
    );
  }

  if (!bankAccountId && !cardId) {
    return NextResponse.json(
      { error: "Associe a transação a uma conta ou cartão" },
      { status: 400 }
    );
  }

  if (bankAccountId && cardId) {
    return NextResponse.json(
      { error: "Escolha apenas conta OU cartão para a transação" },
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

  if (!category) {
    return NextResponse.json(
      { error: "category é obrigatória" },
      { status: 400 }
    );
  }

  const transaction = await prisma.transaction.create({
    data: {
      tenantId,
      bankAccountId,
      cardId,
      amount: parsedAmount,
      type,
      category,
      isFixed: !!isFixed,
      referenceMonth: referenceMonth
        ? new Date(`${referenceMonth}-01T00:00:00.000Z`)
        : null,
    },
  });

  return NextResponse.json({ transaction }, { status: 201 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const month = searchParams.get("month"); // format: YYYY-MM

  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required" },
      { status: 400 }
    );
  }

  const monthFilter =
    month && /^\d{4}-\d{2}$/.test(month)
      ? {
          gte: new Date(`${month}-01T00:00:00.000Z`),
          lt: new Date(
            `${month}-01T00:00:00.000Z`.replace(
              /(\d{4})-(\d{2})/,
              (_, y, m) => {
                const nextMonth = String(Number(m) + 1).padStart(2, "0");
                const nextYear =
                  Number(m) === 12 ? String(Number(y) + 1) : y;
                const realNextMonth = Number(m) === 12 ? "01" : nextMonth;
                return `${nextYear}-${realNextMonth}`;
              }
            )
          ),
        }
      : undefined;

  const transactions = await prisma.transaction.findMany({
    where: {
      tenantId,
      ...(monthFilter
        ? {
            OR: [
              { referenceMonth: monthFilter },
              {
                referenceMonth: null,
                createdAt: monthFilter,
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ transactions });
}
