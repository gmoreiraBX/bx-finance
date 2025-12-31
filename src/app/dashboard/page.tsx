"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardLayout } from "./layout";

type Tenant = {
  id: string;
  name: string;
};

type Summary = {
  accountsCount: number;
  cardsCount: number;
  balance: number;
  totals: { income: number; expense: number };
};

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [message, setMessage] = useState<string>("");

  const userId = useMemo(() => session?.user?.id, [session?.user?.id]);
  const { setConfig } = useDashboardLayout();

  useEffect(() => {
    if (!userId) return;
    loadTenant(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function parseResponse<T>(
    res: Response,
    fallbackMessage: string
  ): Promise<T | null> {
    const raw = await res.text();
    if (!raw) return {} as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      setMessage(fallbackMessage);
      return null;
    }
  }

  async function loadTenant(ownerId: string) {
    const res = await fetch(`/api/tenant?userId=${ownerId}`);
    const raw = await res.text();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data?.tenant) {
        setTenant(data.tenant);
        await loadSummary(data.tenant.id);
      }
    } catch {
      setMessage("Não foi possível carregar seu espaço.");
    }
  }

  const loadSummary = useCallback(
    async (tenantId: string) => {
      const res = await fetch(
        `/api/dashboard?tenantId=${tenantId}&month=${filterMonth}`
      );
      const raw = await res.text();
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        setSummary(data);
      } catch {
        setMessage("Erro ao carregar o saldo.");
      }
    },
    [filterMonth]
  );

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setMessage("Salvando dados...");
    const res = await fetch("/api/tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tenantName, userId }),
    });
    const data = await parseResponse<{ tenant?: Tenant; error?: string }>(
      res,
      "Erro ao criar espaço"
    );
    setMessage("");
    if (res.ok && data?.tenant) {
      setTenant(data.tenant);
      setTenantName("");
      await loadSummary(data.tenant.id);
    } else if (data?.error) {
      setMessage(data.error || "Erro ao criar espaço");
    }
  }

  function parseTenantFirstName(name?: string | null) {
    if (!name) return "";
    return name.split(" ")[0] || name;
  }

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: tenant ? parseTenantFirstName(tenant.name) : "",
      month: filterMonth,
      onMonthChange: setFilterMonth,
      onRefresh: tenant ? () => loadSummary(tenant.id) : undefined,
      message: message || undefined,
    }));
  }, [filterMonth, loadSummary, message, setConfig, tenant]);

  return (
    <>
      {!tenant ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Vamos começar</h2>
          <p className="text-sm text-gray-600">
            Crie seu espaço para organizar suas finanças.
          </p>
          <form onSubmit={handleCreateTenant} className="mt-4 space-y-3">
            <input
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Nome da empresa ou time"
              className="w-full rounded-lg border px-3 py-2"
              required
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Criar tenant
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Entradas"
              value={`R$ ${(summary?.totals.income ?? 0).toFixed(2)}`}
              accent="from-purple-500 to-purple-600"
              delta="+"
            />
            <StatCard
              title="Total Saídas"
              value={`R$ ${(summary?.totals.expense ?? 0).toFixed(2)}`}
              accent="from-orange-400 to-orange-500"
              delta="+"
            />
            <StatCard
              title="Saldo"
              value={`R$ ${(summary?.balance ?? 0).toFixed(2)}`}
              accent="from-emerald-500 to-emerald-600"
              delta={summary && summary.balance >= 0 ? "↑" : "↓"}
            />
            <StatCard
              title="Contas / Cartões"
              value={`${summary?.accountsCount ?? 0} / ${
                summary?.cardsCount ?? 0
              }`}
              accent="from-sky-400 to-sky-500"
              delta=""
            />
          </div>

          <div className="grid gap-4">
            <div className="space-x-4 flex justify-between w-full">
              <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Performance</h3>
                </div>
                <div className="mt-4 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-full bg-linear-to-br from-purple-400 to-orange-300 p-6">
                    <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-sm font-semibold">
                      BRL
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    Real Brasileiro
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                    Dolar Americano
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    Outros
                  </span>
                </div>
              </div>

              <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Visualização de transações
                  </h3>
                </div>
                <div className="mt-4 flex flex-col items-center">
                  <div className="relative h-32 w-32">
                    <div className="absolute inset-0 rounded-full border-10 border-purple-500 border-t-transparent rotate-45"></div>
                    <div className="absolute inset-2 rounded-full border-10 border-emerald-500 border-b-transparent rotate-[-30deg]"></div>
                    <div className="absolute inset-4 rounded-full border-10 border-amber-500 border-l-transparent rotate-12"></div>
                  </div>
                  <p className="mt-2 text-lg font-semibold">
                    R$ {(summary?.totals.income ?? 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-emerald-600">Crescimento mensal</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <LinkCard href="/dashboard/accounts" label="Contas" />
            <LinkCard href="/dashboard/cards" label="Cartões" />
            <LinkCard href="/dashboard/transactions" label="Lançamentos" />
            <LinkCard href="/dashboard/savings" label="Poupança" />
            <LinkCard href="/dashboard/investments" label="Investimentos" />
          </div>
        </>
      )}
    </>
  );
}

function StatCard({
  title,
  value,
  accent,
  delta,
}: {
  title: string;
  value: string;
  accent: string;
  delta: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        {delta && (
          <span className="text-xs text-emerald-600 font-semibold">
            {delta}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <div
        className={`mt-3 h-1.5 w-full rounded-full bg-linear-to-r ${accent}`}
      ></div>
    </div>
  );
}

function LinkCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm font-medium hover:bg-slate-50 flex items-center justify-between"
    >
      <span>{label}</span>
      <span className="text-slate-400">→</span>
    </Link>
  );
}
