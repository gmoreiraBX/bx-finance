"use client";

import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useDashboardLayout } from "../../layout";
import {
  PlanCards,
  plans,
  type Plan,
  type BillingCycle,
} from "@/components/plan-cards";
import { PaymentLinkBanner } from "@/components/payment-link-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const planExtras: Record<Plan["id"], string[]> = {
  free: [
    "Ideal para começar manualmente e entender sua organização.",
    "Sem custos, com foco em controle básico.",
    "Faça upgrade quando quiser para automatizar.",
  ],
  core: [
    "Automação diária para manter suas contas em dia.",
    "Mais velocidade na organização e categorização.",
    "Suporte pensado para quem está começando a conectar bancos.",
  ],
  pro: [
    "Mais frequência de atualizações para quem tem alto volume.",
    "Separação PF/PJ sem dor de cabeça.",
    "Insights e alertas para decisões mais rápidas.",
  ],
};

export default function PlanDetailsPage() {
  const { data: session } = authClient.useSession();
  const { setConfig } = useDashboardLayout();
  const userId = session?.user?.id;
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [currentPlanId, setCurrentPlanId] = useState<Plan["id"]>("free");
  const [billings, setBillings] = useState<any[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [pixKey] = useState("finance@basix.com");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const latest = useMemo(() => billings[0] || null, [billings]);
  const paymentLinks = useMemo(
    () =>
      billings
        .filter((b) => !!b.providerPaymentLink)
        .map((b) => ({
          id: b.id,
          link: b.providerPaymentLink as string,
          createdAt: b.createdAt,
          status: b.status,
          planId: b.planId,
        })),
    [billings]
  );

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: "Detalhes dos planos",
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
      if (data.billing?.planId) {
        setCurrentPlanId((data.billing.planId as Plan["id"]) || "free");
      }
      if (data.billing?.providerPaymentLink) {
        setPaymentLink(data.billing.providerPaymentLink);
      }
    } catch {
      setMessage("Não foi possível carregar o faturamento.");
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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-8">
      <div className="space-y-2">
        <Badge variant="secondary">Planos</Badge>
        <h1 className="text-3xl font-semibold">Compare e escolha o seu</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Detalhamos o que cada plano oferece para você decidir se prefere ficar
          no manual, automatizar o básico ou ter mais performance e insights.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Seu plano atual</CardTitle>
            <p className="text-sm text-muted-foreground">
              Status e link de pagamento (quando houver).
            </p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {latest?.status?.toLowerCase() || "pendente"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <PaymentLinkBanner paymentLink={paymentLink} />
          {paymentLinks.length > 0 && (
            <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
              <div className="text-sm font-semibold">Links anteriores</div>
              <ul className="space-y-2 text-xs text-slate-700">
                {paymentLinks.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col rounded-md bg-white px-3 py-2 border"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        Plano: {p.planId || "-"}
                      </span>
                      <span className="text-muted-foreground capitalize">
                        {p.status?.toLowerCase() || "pendente"}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono">{p.link}</span>
                      <div className="flex gap-2">
                        <button
                          className="text-xs text-blue-600 underline"
                          onClick={() => navigator.clipboard.writeText(p.link)}
                        >
                          Copiar
                        </button>
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 underline"
                        >
                          Abrir
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Planos disponíveis</h2>
          <p className="text-sm text-muted-foreground">
            Selecione e conclua o upgrade aqui mesmo.
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
        isLoading={isLoading}
        onlyPrice={true}
      />
      {/* <Separator /> */}
      <div className="grid gap-4 md:grid-cols-3 w-[100% -10px] -mt-12">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <Card
              key={plan.id}
              className={cn(
                plan.highlight && "border-emerald-500",
                "rounded-tl-none rounded-tr-none"
              )}
            >
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  <div className="font-medium">Por que escolher</div>
                  <ul className="space-y-2 text-muted-foreground">
                    {planExtras[plan.id].map((extra) => (
                      <li key={extra} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600 mt-0.5" />
                        <span>{extra}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="font-medium">Inclui</div>
                  <ul className="space-y-2 text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.limitations?.length ? (
                  <div className="space-y-2">
                    <div className="font-medium text-muted-foreground">
                      Limitações
                    </div>
                    <ul className="space-y-2 text-muted-foreground">
                      {plan.limitations.map((lim) => (
                        <li key={lim} className="flex items-start gap-2">
                          <XIcon className="h-4 w-4 text-amber-600 mt-0.5" />
                          <span>{lim}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {!isCurrent && (
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => openPaymentModal(plan)}
                    disabled={!userId || isLoading || isCurrent}
                  >
                    Escolher {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
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
                  Escolha cartão ou Pix. Não armazenamos os dados do seu cartão;
                  eles são usados apenas para processar o pagamento.
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
                    Use a chave Pix abaixo ou continue para gerar o link de
                    pagamento.
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
                  Não salvamos dados do cartão. O processamento é feito
                  diretamente na Asaas.
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
