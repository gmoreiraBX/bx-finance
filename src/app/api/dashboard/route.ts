import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const month = searchParams.get("month"); // YYYY-MM

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

  const [accountsCount, cardsCount, income, expense] = await Promise.all([
    prisma.bankAccount.count({ where: { tenantId } }),
    prisma.card.count({ where: { tenantId } }),
    prisma.transaction.aggregate({
      where: {
        tenantId,
        type: "INCOME",
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
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        tenantId,
        type: "EXPENSE",
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
      _sum: { amount: true },
    }),
  ]);

  const incomeTotal = Number(income._sum.amount || 0);
  const expenseTotal = Number(expense._sum.amount || 0);

  return NextResponse.json({
    accountsCount,
    cardsCount,
    balance: incomeTotal - expenseTotal,
    totals: {
      income: incomeTotal,
      expense: expenseTotal,
    },
  });
}
