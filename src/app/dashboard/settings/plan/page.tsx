"use client";

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useDashboardLayout } from "../../layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  PlanCards,
  plans,
  type BillingCycle,
  type Plan,
} from "@/components/plan-cards";
import { PaymentLinkBanner } from "@/components/payment-link-banner";

type BillingRecord = {
  id: string;
  planId: string;
  cycle: "MONTHLY" | "YEARLY";
  status: string;
  providerSubscriptionId?: string | null;
  providerPaymentLink?: string | null;
  priceCents?: number | null;
  createdAt: string;
};

const planLabels: Record<string, string> = {
  free: "Manual",
  core: "Conectado",
  pro: "Plus",
};

export default function PlanoSettingsPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const { setConfig } = useDashboardLayout();
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [pixKey] = useState("finance@basix.com");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const latest = useMemo(() => billings[0] || null, [billings]);
  const currentPlanId =
    (latest?.planId as Plan["id"] | undefined) || ("free" as Plan["id"]);

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: "Configurações • Plano",
      month: undefined,
      onMonthChange: undefined,
      onRefresh: userId ? () => loadBillings(userId) : undefined,
      message: message || undefined,
    }));
  }, [message, setConfig, userId]);

  useEffect(() => {
    if (!userId) return;
    loadBillings(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadBillings(uid: string) {
    try {
      const res = await fetch(`/api/billing?userId=${uid}&sync=true`);
      const raw = await res.text();
      if (!raw) return;
      const data = JSON.parse(raw);
      setBillings(data.billings || []);
      if (data.billings?.[0]?.providerPaymentLink) {
        setPaymentLink(data.billings[0].providerPaymentLink);
      }
    } catch {
      setMessage("Não foi possível carregar o histórico de pagamentos.");
    }
  }

  function resetPaymentForm() {
    setPaymentMethod("card");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
  }

  function openPaymentModal(plan: Plan) {
    setSelectedPlan(plan);
    resetPaymentForm();
    setPaymentModalOpen(true);
  }

  async function handleUpgrade(planId: Plan["id"]) {
    if (!userId) {
      setMessage("Faça login para fazer upgrade.");
      return null;
    }
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return null;

    const amountCents =
      billingCycle === "yearly"
        ? Math.round(plan.yearlyTotal * 100)
        : Math.round(plan.price.monthly * 100);

    setIsLoading(true);
    setMessage("Gerando cobrança com a Asaas...");

    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          planId,
          billingCycle,
          amountCents,
        }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (res.ok && data?.billing) {
        setPaymentLink(
          data.paymentLink ||
            data.billing?.providerPaymentLink ||
            data.subscription?.invoiceUrl ||
            null
        );
        await loadBillings(userId);
        setMessage("Upgrade solicitado. Verifique o link de pagamento.");
        return { paymentLink: data.paymentLink || null };
      } else {
        setMessage(data?.error || "Não foi possível finalizar o upgrade.");
      }
    } catch (error: any) {
      setMessage(error?.message || "Erro ao conectar com o billing.");
    } finally {
      setIsLoading(false);
    }
    return null;
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan) return;
    if (paymentMethod === "card") {
      if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        setMessage("Preencha todos os dados do cartão.");
        return;
      }
    }
    await handleUpgrade(selectedPlan.id);
    setPaymentModalOpen(false);
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      )}

      <Card className="bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Seu plano</CardTitle>
            <CardDescription>
              Status e link de pagamento para o plano atual.
            </CardDescription>
          </div>
          {latest?.status && (
            <Badge variant="secondary" className="capitalize">
              {latest.status.toLowerCase()}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {latest ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">
                  Plano: {planLabels[latest.planId] || latest.planId}
                </span>
                <span className="text-muted-foreground">
                  Ciclo: {latest.cycle === "YEARLY" ? "Anual" : "Mensal"}
                </span>
                {latest.providerSubscriptionId && (
                  <span className="text-muted-foreground">
                    Assinatura: {latest.providerSubscriptionId}
                  </span>
                )}
              </div>
              {latest.providerPaymentLink ? (
                <div className="flex flex-col gap-2 rounded-lg border bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Link de pagamento</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            latest.providerPaymentLink || ""
                          )
                        }
                      >
                        Copiar
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={latest.providerPaymentLink}
                          target="_blank"
                        >
                          Abrir
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-md bg-white px-3 py-2 font-mono text-xs text-slate-900">
                    {latest.providerPaymentLink}
                  </div>
                  <p className="text-xs text-slate-600">
                    Não armazenamos dados do seu cartão. O link leva direto para
                    o checkout seguro da Asaas (cartão ou Pix).
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda não existe link de pagamento para o plano atual.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma assinatura criada ainda. Faça upgrade para gerar um
              pagamento.
            </p>
          )}
        </CardContent>
      </Card>

      <PaymentLinkBanner paymentLink={paymentLink} />

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Histórico de cobranças</CardTitle>
          <CardDescription>Dados sincronizados da Asaas.</CardDescription>
        </CardHeader>
        <CardContent>
          {billings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2">Plano</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Ciclo</th>
                    <th className="pb-2">Assinatura</th>
                    <th className="pb-2">Criado</th>
                    <th className="pb-2">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {billings.map((billing) => (
                    <tr key={billing.id} className="border-t">
                      <td className="py-2 font-medium">
                        {planLabels[billing.planId] || billing.planId}
                      </td>
                      <td className="py-2 capitalize">
                        {billing.status.toLowerCase()}
                      </td>
                      <td className="py-2">
                        {billing.cycle === "YEARLY" ? "Anual" : "Mensal"}
                      </td>
                      <td className="py-2">
                        {billing.providerSubscriptionId || "-"}
                      </td>
                      <td className="py-2">
                        {new Date(billing.createdAt).toLocaleDateString(
                          "pt-BR"
                        )}
                      </td>
                      <td className="py-2">
                        {billing.providerPaymentLink ? (
                          <Link
                            href={billing.providerPaymentLink}
                            className="text-blue-600 underline"
                            target="_blank"
                          >
                            Ver cobrança
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma cobrança encontrada.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Planos disponíveis</h2>
            <p className="text-sm text-muted-foreground">
              Escolha um plano para finalizar o upgrade.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={
                billingCycle === "monthly"
                  ? "text-slate-900 font-medium"
                  : "text-slate-500"
              }
            >
              Mensal
            </span>
            <Switch
              checked={billingCycle === "yearly"}
              onCheckedChange={(v) => setBillingCycle(v ? "yearly" : "monthly")}
              aria-label="Alternar cobrança mensal/anual"
            />
            <span
              className={
                billingCycle === "yearly"
                  ? "text-slate-900 font-medium"
                  : "text-slate-500"
              }
            >
              Anual
            </span>
          </div>
        </div>
        <PlanCards
          billingCycle={billingCycle}
          currentPlanId={currentPlanId}
          onSelectPlan={openPaymentModal}
          disableCta={!userId || isLoading}
        />
      </div>

      {paymentModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Finalizar upgrade para {selectedPlan.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Escolha cartão ou Pix. Não armazenamos os dados do seu cartão; eles
                  são usados apenas para processar o pagamento.
                </p>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="payment-method"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                  />
                  Cartão de crédito
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="payment-method"
                    value="pix"
                    checked={paymentMethod === "pix"}
                    onChange={() => setPaymentMethod("pix")}
                  />
                  Pix
                </label>
              </div>

              {paymentMethod === "card" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Nome impresso no cartão"
                    className="w-full rounded-lg border px-3 py-2 md:col-span-2"
                  />
                  <input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="Número do cartão"
                    className="w-full rounded-lg border px-3 py-2 md:col-span-2"
                    inputMode="numeric"
                  />
                  <input
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="Validade (MM/AA)"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                  <input
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="CVV"
                    className="w-full rounded-lg border px-3 py-2"
                    inputMode="numeric"
                  />
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border px-3 py-3 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-800">
                    Pagar via Pix
                  </p>
                  <p className="text-sm text-gray-600">
                    Use a chave Pix abaixo ou continue para gerar o link de pagamento.
                  </p>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-white">
                    <span className="text-sm font-mono">{pixKey}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(pixKey)}
                      className="text-xs text-blue-600 underline"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Finalize para gerar o link/QR Code do Pix na Asaas.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span>
                  Não salvamos dados do cartão. O processamento é feito diretamente na
                  Asaas.
                </span>
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="w-full rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Gerando..." : "Gerar link de pagamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
