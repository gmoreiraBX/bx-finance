import "dotenv/config";

const rawBase =
  process.env.NEXT_PUBLIC_ASAAS_URL || "https://www.asaas.com/api/v3";
const normalizedBase = rawBase.replace(/\/$/, "");
const ASAAS_API_URL = normalizedBase.endsWith("/v3")
  ? normalizedBase
  : `${normalizedBase}/v3`;
// Support both server-side and NEXT_PUBLIC keys (in case of misnaming).
const ASAAS_API_KEY =
  process.env.ASAAS_API_KEY ||
  process.env.NEXT_PUBLIC_ASAAS_API_KEY ||
  process.env.ASSAS_API_KEY;

type AsaasRequestOptions = {
  path: string;
  method?: "GET" | "POST";
  body?: Record<string, any>;
};

function getPaymentLink(raw: any): string | undefined {
  return (
    raw?.invoiceUrl ||
    raw?.paymentLink ||
    raw?.bankSlipUrl ||
    raw?.boletoUrl ||
    raw?.pixQrCodeUrl ||
    raw?.pix?.qrCodeUrl ||
    raw?.invoiceUrlOriginal
  );
}

async function asaasRequest<T>({
  path,
  method = "GET",
  body,
}: AsaasRequestOptions) {
  if (!ASAAS_API_KEY) {
    throw new Error("ASAAS_API_KEY não configurada.");
  }

  const response = await fetch(`${ASAAS_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  let raw: any = null;
  if (rawText) {
    try {
      raw = JSON.parse(rawText);
    } catch {
      // Keep raw text for debugging without breaking JSON parse errors.
      raw = rawText;
    }
  }

  if (!response.ok) {
    const message =
      raw?.errors?.[0]?.description ||
      raw?.message ||
      (typeof raw === "string" ? raw : "Erro na Asaas.");
    throw new Error(message);
  }

  return raw as T;
}

export async function createAsaasCustomer({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const customer = await asaasRequest<{ id: string }>({
    path: "/customers",
    method: "POST",
    body: {
      name,
      email,
      notificationsDisabled: true,
    },
  });

  return customer;
}

export async function createAsaasSubscription({
  customerId,
  planId,
  amountCents,
  cycle,
}: {
  customerId: string;
  planId: string;
  amountCents: number;
  cycle: "MONTHLY" | "YEARLY";
}) {
  const subscription = await asaasRequest<{
    id: string;
    status: string;
    invoiceUrl?: string;
    paymentLink?: string;
    bankSlipUrl?: string;
    boletoUrl?: string;
    pixQrCodeUrl?: string;
    pix?: { qrCodeUrl?: string };
  }>({
    path: "/subscriptions",
    method: "POST",
    body: {
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: Number((amountCents / 100).toFixed(2)),
      cycle: cycle === "YEARLY" ? "YEARLY" : "MONTHLY",
      description: `Plano ${planId}`,
    },
  });

  return {
    ...subscription,
    paymentLink: getPaymentLink(subscription),
  };
}

export function extractAsaasPaymentLink(raw: any) {
  return getPaymentLink(raw);
}

export async function listAsaasSubscriptionPayments(subscriptionId: string) {
  const payments = await asaasRequest<any[]>({
    path: `/subscriptions/${subscriptionId}/payments`,
    method: "GET",
  });

  return payments.map((p) => ({
    ...p,
    paymentLink: getPaymentLink(p),
  }));
}
