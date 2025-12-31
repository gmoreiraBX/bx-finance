import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Check, CreditCard, LineChart, MessageCircle, Zap } from "lucide-react";

export type BillingCycle = "monthly" | "yearly";

export type Plan = {
  id: "free" | "core" | "pro";
  name: string;
  tagline: string;
  highlight?: boolean;
  price: {
    monthly: number;
    yearlyMonthlyEquivalent: number;
  };
  yearlyTotal: number;
  badge?: string;
  features: string[];
  limitations?: string[];
};

export const plans: Plan[] = [
  {
    id: "free",
    name: "Manual",
    tagline: "Para quem gosta de acompanhar tudo e lançar manualmente.",
    price: { monthly: 0, yearlyMonthlyEquivalent: 0 },
    yearlyTotal: 0,
    features: [
      "Controle manual de contas e cartões",
      "Categorias e subcategorias",
      "Relatórios simples",
      "Alertas de contas a pagar",
    ],
    limitations: ["Sem conexão bancária", "Sem insights avançados"],
  },
  {
    id: "core",
    name: "Conectado",
    tagline: "Automatize sua organização e ganhe tempo no dia a dia.",
    badge: "Mais popular",
    highlight: true,
    price: { monthly: 49.9, yearlyMonthlyEquivalent: 41.0 },
    yearlyTotal: 492,
    features: [
      "Tudo do plano Manual, mais:",
      "Até 5 contas/cartões conectados",
      "Atualizações automáticas 1x/dia",
      "Classificação inteligente",
      "Alertas de gastos e cartões",
    ],
  },
  {
    id: "pro",
    name: "Conectado Plus",
    tagline: "Para quem tem mais contas, precisa de mais automação e clareza.",
    price: { monthly: 79.9, yearlyMonthlyEquivalent: 66.0 },
    yearlyTotal: 797,
    features: [
      "Tudo do plano Conectado, mais:",
      "Até 10 contas/cartões conectados",
      "Atualizações extras de transações (mais frequência)",
      "Pessoa Física + Pessoa Jurídica",
      "Insights avançados (padrões e alertas)",
      "Suporte prioritário",
    ],
  },
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function FeatureList({ items, muted }: { items: string[]; muted?: boolean }) {
  return (
    <ul className={cn("space-y-2 text-sm", muted && "text-muted-foreground")}>
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2">
          <span
            className={cn(
              "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full",
              muted ? "bg-muted" : "bg-emerald-500/15"
            )}
          >
            <Check
              className={cn(
                "h-4 w-4",
                muted ? "text-muted-foreground" : "text-emerald-600"
              )}
            />
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function PriceBlock({ plan, billing }: { plan: Plan; billing: BillingCycle }) {
  const isPaid = plan.price.monthly > 0;

  if (!isPaid) {
    return (
      <div className="space-y-1">
        <div className="text-3xl font-semibold">Grátis</div>
        <div className="text-sm text-muted-foreground">
          Comece no manual e faça upgrade quando quiser.
        </div>
      </div>
    );
  }

  const monthlyShown =
    billing === "monthly"
      ? plan.price.monthly
      : plan.price.yearlyMonthlyEquivalent;

  const suffix = "/mês";
  const note =
    billing === "monthly"
      ? "Cancele quando quiser."
      : `Cobrado anualmente: ${formatBRL(
          plan.yearlyTotal
        )} (economize no anual).`;

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-2">
        <div className="text-3xl font-semibold">{formatBRL(monthlyShown)}</div>
        <div className="pb-1 text-sm text-muted-foreground">{suffix}</div>
      </div>
      <div className="text-sm text-muted-foreground">{note}</div>
    </div>
  );
}

type PlanCardsProps = {
  billingCycle: BillingCycle;
  currentPlanId?: Plan["id"];
  isLoading?: boolean;
  onSelectPlan?: (plan: Plan) => void;
  disableCta?: boolean;
  onlyPrice?: boolean;
};

export function PlanCards({
  billingCycle,
  currentPlanId,
  isLoading,
  onSelectPlan,
  disableCta,
  onlyPrice,
}: PlanCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const isPaid = plan.price.monthly > 0;

        if (onlyPrice) {
          return (
            <Card
              className={cn(
                isCurrent && "bg-emerald-50 border border-emerald-500"
              )}
              key={plan.id}
            >
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                  {plan.id === "pro" ? (
                    <Zap className="h-5 w-5" />
                  ) : plan.id === "core" ? (
                    <CreditCard className="h-5 w-5" />
                  ) : (
                    <LineChart className="h-5 w-5" />
                  )}
                  {plan.name}
                  {isCurrent && (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                      Seu plano atual
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                <PriceBlock plan={plan} billing={billingCycle} />
              </CardHeader>
            </Card>
          );
        }
        return (
          <Card
            key={plan.id}
            className={cn(
              "relative overflow-hidden",
              plan.highlight && "border-emerald-500/50 shadow-sm",
              isCurrent && "ring-1 ring-primary/30"
            )}
          >
            {plan.badge && (
              <div className="absolute right-4 top-4">
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  {plan.badge}
                </Badge>
              </div>
            )}

            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                {plan.id === "pro" ? (
                  <Zap className="h-5 w-5" />
                ) : plan.id === "core" ? (
                  <CreditCard className="h-5 w-5" />
                ) : (
                  <LineChart className="h-5 w-5" />
                )}
                {plan.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{plan.tagline}</p>
            </CardHeader>

            <CardContent className="space-y-5">
              <PriceBlock plan={plan} billing={billingCycle} />

              <Separator />

              <div className="space-y-3">
                <div className="text-sm font-medium">Inclui</div>
                <FeatureList items={plan.features} />
              </div>

              {plan.limitations?.length ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    Limitações
                  </div>
                  <FeatureList items={plan.limitations} muted />
                </div>
              ) : null}
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              {isCurrent ? (
                <Button className="w-full" variant="secondary" disabled>
                  Plano atual
                </Button>
              ) : (
                <Button
                  className={cn(
                    "w-full",
                    plan.highlight && "bg-emerald-600 hover:bg-emerald-600/90"
                  )}
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => onSelectPlan?.(plan)}
                  disabled={
                    isLoading ||
                    disableCta ||
                    (!isPaid && currentPlanId === "free")
                  }
                >
                  {plan.id === "free"
                    ? "Continuar no Manual"
                    : `Fazer upgrade para ${plan.name}`}
                </Button>
              )}

              <Button asChild variant="ghost" className="w-full">
                <Link href="#" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Falar com suporte / tirar dúvidas
                </Link>
              </Button>

              {plan.highlight && (
                <p className="text-center text-xs text-muted-foreground">
                  Recomendado para começar com conexão e automação.
                </p>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
