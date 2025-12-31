import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;

function mapStatus(status?: string) {
  if (!status) return "PENDING";
  const normalized = status.toUpperCase();
  if (["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH", "RECEIVED_AFTER_DUE_DATE", "ACTIVE"].includes(normalized)) {
    return "ACTIVE";
  }
  if (["PENDING", "AWAITING_PAYMENT", "AWAITING"].includes(normalized)) {
    return "PENDING";
  }
  if (["CANCELLED", "DELETED", "REFUNDED"].includes(normalized)) {
    return "CANCELLED";
  }
  return "FAILED";
}

function extractSubscriptionId(body: any): string | null {
  return (
    body?.subscription?.id ||
    body?.payment?.subscription ||
    body?.payment?.subscriptionId ||
    body?.subscription ||
    null
  );
}

export async function POST(request: Request) {
  if (!WEBHOOK_TOKEN) {
    return NextResponse.json(
      { error: "ASAAS_WEBHOOK_TOKEN não configurado" },
      { status: 500 }
    );
  }

  const incomingToken = request.headers.get("asaas-access-token");
  if (!incomingToken || incomingToken !== WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subscriptionId = extractSubscriptionId(body);
  if (!subscriptionId) {
    return NextResponse.json({ ok: true, ignored: "no subscription id" });
  }

  const status = mapStatus(
    body?.payment?.status ||
      body?.subscription?.status ||
      body?.status ||
      body?.event
  );

  await prisma.billing.updateMany({
    where: { providerSubscriptionId: subscriptionId },
    data: {
      status,
      metadata: body,
    },
  });

  return NextResponse.json({ ok: true });
}
