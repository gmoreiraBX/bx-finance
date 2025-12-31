"use client";

import * as React from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Sparkles,
  BadgeCheck,
  Zap,
  CreditCard,
  LineChart,
} from "lucide-react";
import { useDashboardLayout } from "../layout";
import {
  PlanCards,
  plans,
  type BillingCycle,
  type Plan,
} from "@/components/plan-cards";
import { PaymentLinkBanner } from "@/components/payment-link-banner";

export default function UpgradePage() {
  const { data: session } = authClient.useSession();
  const [billingCycle, setBillingCycle] =
    React.useState<BillingCycle>("monthly");
  const [currentPlanId, setCurrentPlanId] = React.useState<Plan["id"]>("free");
  const [message, setMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<"card" | "pix">(
    "card"
  );
  const [cardName, setCardName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [cardExpiry, setCardExpiry] = React.useState("");
  const [cardCvv, setCardCvv] = React.useState("");
  const [pixKey] = React.useState("finance@basix.com");
  const [paymentLink, setPaymentLink] = React.useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = React.useState("");
  const { setConfig } = useDashboardLayout();

  const currentPlan = plans.find((p) => p.id === currentPlanId) || plans[0];

  const loadBilling = React.useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/billing?userId=${session.user.id}&sync=true`);
      const raw = await res.text();
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.billing) {
        setCurrentPlanId((data.billing.planId || "free") as Plan["id"]);
        if (data.billing.providerPaymentLink) {
          setPaymentLink(data.billing.providerPaymentLink);
        }
      }
    } catch {
      setMessage("Não foi possível carregar o faturamento.");
    }
  }, [session?.user?.id]);

  function resetPaymentForm() {
    setPaymentMethod("card");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setPaymentNotice("");
  }

  function openPaymentModal(plan: Plan) {
    setSelectedPlan(plan);
    resetPaymentForm();
    setPaymentModalOpen(true);
  }

  async function handleUpgrade(planId: Plan["id"]) {
    if (!session?.user?.id) {
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
          userId: session.user.id,
          planId,
          billingCycle,
          amountCents,
        }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (res.ok && data?.billing) {
        setCurrentPlanId(planId);
        const link =
          data.paymentLink ||
          data.billing?.providerPaymentLink ||
          data.subscription?.invoiceUrl ||
          null;
        setPaymentLink(link);
        setPaymentNotice(
          link
            ? "Link de pagamento gerado. Você pode pagar via cartão ou Pix."
            : ""
        );
        setMessage("Upgrade solicitado. Verifique o link de pagamento.");
        return { billing: data.billing, paymentLink: link };
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
        setPaymentNotice("Preencha todos os dados do cartão.");
        return;
      }
    }
    const result = await handleUpgrade(selectedPlan.id);
    if (result?.paymentLink) {
      setPaymentNotice(
        paymentMethod === "pix"
          ? "Use o link abaixo para gerar o QR Code Pix."
          : "Link pronto. Seus dados não foram armazenados."
      );
    }
    setPaymentModalOpen(false);
  }

  React.useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: "Upgrade",
      month: undefined,
      onMonthChange: undefined,
      onRefresh: undefined,
      message: message || undefined,
    }));
  }, [message, setConfig]);

  React.useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        {/* Header interno */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Upgrade
              </Badge>
              <Badge variant="outline" className="gap-1">
                <BadgeCheck className="h-3.5 w-3.5" />
                Cliente logado
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Desbloqueie automação e insights no Basix Finance
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Menos planilha, mais clareza. Conecte contas, atualize transações
              automaticamente e acompanhe seu saldo e gastos com mais precisão.
            </p>
          </div>

          <Card className="w-full md:w-[420px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Seu plano atual</CardTitle>
              <CardDescription>
                Você está no{" "}
                <span className="font-medium text-foreground">
                  {currentPlan.name}
                </span>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Cobrança</div>
                  <div className="text-xs text-muted-foreground">
                    {billingCycle === "monthly"
                      ? "Mensal"
                      : "Anual (com desconto)"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs",
                      billingCycle === "monthly"
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    Mensal
                  </span>
                  <Switch
                    checked={billingCycle === "yearly"}
                    onCheckedChange={(v) =>
                      setBillingCycle(v ? "yearly" : "monthly")
                    }
                    aria-label="Alternar cobrança mensal/anual"
                  />
                  <span
                    className={cn(
                      "text-xs",
                      billingCycle === "yearly"
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    Anual
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  Transparente e sem pegadinhas
                </div>
                <div className="mt-1 text-muted-foreground">
                  Você pode cancelar quando quiser. Upgrade ativa recursos
                  imediatamente.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        {message && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {message}
          </div>
        )}
        <PaymentLinkBanner paymentLink={paymentLink} notice={paymentNotice} />

        {/* Cards de planos */}
        <PlanCards
          billingCycle={billingCycle}
          currentPlanId={currentPlanId}
          isLoading={isLoading}
          onSelectPlan={openPaymentModal}
        />

        <div className="mt-10 rounded-xl border bg-muted/30 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold">
                Pronto para destravar o PRO?
              </div>
              <div className="text-sm text-muted-foreground">
                Upgrade em 1 clique. Sem burocracia.
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="bg-emerald-600 hover:bg-emerald-600/90"
                onClick={() => {
                  const plan = plans.find((p) => p.id === "core");
                  if (plan) openPaymentModal(plan);
                }}
              >
                Upgrade agora
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/upgrade/plan-details">
                  Ver detalhes dos planos
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-10" />

        {/* Seção de valor */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>O que você ganha com o Pro</CardTitle>
              <CardDescription>
                Melhor para quem tem mais contas, usa cartão com frequência e
                quer decisões rápidas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 font-medium">
                  <Zap className="h-4 w-4" />
                  Atualizações mais frequentes
                </div>
                <p className="mt-1 text-muted-foreground">
                  Menos “lançamento atrasado”, mais visão do mês em tempo certo.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 font-medium">
                  <CreditCard className="h-4 w-4" />
                  Mais contas e cartões
                </div>
                <p className="mt-1 text-muted-foreground">
                  Ideal se você separa PF/PJ, tem múltiplos bancos ou cartões.
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 font-medium">
                  <LineChart className="h-4 w-4" />
                  Insights e alertas
                </div>
                <p className="mt-1 text-muted-foreground">
                  Indicadores que ajudam a entender padrões e antecipar
                  problemas.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Perguntas frequentes</CardTitle>
              <CardDescription>Sem letras miúdas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium">Posso cancelar quando quiser?</div>
                <div className="text-muted-foreground">
                  Sim. Você continua com acesso ao plano até o fim do período
                  pago.
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="font-medium">O upgrade ativa na hora?</div>
                <div className="text-muted-foreground">
                  Sim. Assim que o pagamento confirmar, os recursos do plano são
                  liberados.
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="font-medium">E se eu escolher anual?</div>
                <div className="text-muted-foreground">
                  Você paga uma vez e economiza no valor equivalente mensal.
                </div>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button
                className="w-full md:w-auto"
                onClick={() => handleUpgrade("core")}
              >
                Começar pelo Conectado
              </Button>
              <Button
                className="w-full md:w-auto"
                variant="outline"
                onClick={() => {
                  const plan = plans.find((p) => p.id === "pro");
                  if (plan) openPaymentModal(plan);
                }}
              >
                Ir direto no Plus
              </Button>
            </CardFooter>
          </Card>
        </div>
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
                >
                  Gerar link de pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
