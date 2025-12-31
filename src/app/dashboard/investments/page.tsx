"use client";

import { authClient } from "@/lib/auth-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardLayout } from "../layout";

type Tenant = { id: string; name: string };
type BankAccount = { id: string; nickname: string };
type Transaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  isFixed?: boolean;
  createdAt: string;
  referenceMonth?: string | null;
  bankAccountId?: string | null;
};

const CATEGORY_DEFAULT = "Investimento";

export default function InvestmentsPage() {
  const { data: session } = authClient.useSession();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [filterAccount, setFilterAccount] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formValue, setFormValue] = useState("");
  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [formCategory, setFormCategory] = useState(CATEGORY_DEFAULT);
  const [formMonth, setFormMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [formFixed, setFormFixed] = useState(false);
  const [formAccount, setFormAccount] = useState<string>("");
  const [message, setMessage] = useState("");
  const userId = useMemo(() => session?.user?.id, [session?.user?.id]);
  const { setConfig } = useDashboardLayout();

  useEffect(() => {
    if (!userId) return;
    loadTenant(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadTenant(ownerId: string) {
    const res = await fetch(`/api/tenant?userId=${ownerId}`);
    const raw = await res.text();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data?.tenant) {
        setTenant(data.tenant);
        await Promise.all([
          loadAccounts(data.tenant.id),
          loadTransactions(data.tenant.id),
        ]);
      }
    } catch {
      setMessage("Erro ao carregar tenant.");
    }
  }

  async function loadAccounts(tenantId: string) {
    const res = await fetch(`/api/accounts?tenantId=${tenantId}`);
    const raw = await res.text();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setAccounts(data.bankAccounts || []);
      if ((data.bankAccounts || []).length && !formAccount) {
        setFormAccount(data.bankAccounts[0].id);
      }
    } catch {
      setMessage("Erro ao carregar contas.");
    }
  }

  const loadTransactions = useCallback(
    async (tenantId: string) => {
      const res = await fetch(
        `/api/transactions?tenantId=${tenantId}&month=${filterMonth}`
      );
      const raw = await res.text();
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        setTransactions(
          (data.transactions || []).filter((t: Transaction) =>
            (t.category || "").toLowerCase().includes("invest")
          )
        );
      } catch {
        setMessage("Erro ao carregar lançamentos.");
      }
    },
    [filterMonth]
  );

  const filteredTransactions = transactions.filter((t) =>
    filterAccount ? t.bankAccountId === filterAccount : true
  );

  const income = filteredTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = filteredTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: "Investimentos",
      month: filterMonth,
      onMonthChange: setFilterMonth,
      onRefresh: tenant ? () => loadTransactions(tenant.id) : undefined,
      message: message || undefined,
    }));
  }, [filterMonth, loadTransactions, message, setConfig, tenant]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !formAccount) {
      setMessage("Escolha uma conta.");
      return;
    }
    const payload = {
      tenantId: tenant.id,
      bankAccountId: formAccount,
      amount: formValue,
      type: formType,
      category: formCategory || CATEGORY_DEFAULT,
      isFixed: formFixed,
      referenceMonth: formMonth,
    };

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        setMessage("Erro ao lançar transação");
      }
    }
    if (res.ok) {
      setModalOpen(false);
      setFormValue("");
      setFormCategory(CATEGORY_DEFAULT);
      setFormFixed(false);
      if (tenant) await loadTransactions(tenant.id);
      setMessage("");
    } else if (data?.error) {
      setMessage(data.error || "Erro ao lançar transação");
    }
  }

  return (
    <>
      {!tenant ? (
        <p className="text-sm text-gray-600">
          Cadastre um tenant no dashboard para lançar investimentos.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="rounded-lg border px-3 py-2"
              />
              <button
                onClick={() => loadTransactions(tenant.id)}
                className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
              >
                Filtrar mês
              </button>
            </div>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="rounded-lg border px-3 py-2"
            >
              <option value="">Todas as contas</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nickname}
                </option>
              ))}
            </select>
            <button
              onClick={() => setModalOpen(true)}
              className="ml-auto rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800"
            >
              Novo lançamento
            </button>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Lançamentos</h2>
            <p className="text-sm text-gray-600 mb-2">
              Entradas R$ {income.toFixed(2)} · Saídas R$ {expense.toFixed(2)} ·
              Saldo R$ {(income - expense).toFixed(2)}
            </p>
            <ul className="space-y-2 text-sm">
              {filteredTransactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 bg-gray-50"
                >
                  <div>
                    <p
                      className={
                        t.type === "INCOME"
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }
                    >
                      {t.type === "INCOME" ? "+" : "-"} R${" "}
                      {Number(t.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.category}
                      {t.isFixed ? " · Fixa" : ""} ·{" "}
                      {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </li>
              ))}
              {filteredTransactions.length === 0 && (
                <li className="text-xs text-gray-500">
                  Nenhum lançamento para este filtro.
                </li>
              )}
            </ul>
          </div>
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nova entrada/saída</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Fechar
              </button>
            </div>
            <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="Valor"
                className="w-full rounded-lg border px-3 py-2 md:col-span-2"
                required
              />
              <select
                value={formType}
                onChange={(e) =>
                  setFormType(e.target.value as "INCOME" | "EXPENSE")
                }
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="INCOME">Entrada</option>
                <option value="EXPENSE">Saída</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formFixed}
                  onChange={(e) => setFormFixed(e.target.checked)}
                />
                Despesa fixa mensal
              </label>
              <input
                type="month"
                value={formMonth}
                onChange={(e) => setFormMonth(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 md:col-span-2"
              />
              <input
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="Categoria"
                className="w-full rounded-lg border px-3 py-2 md:col-span-2"
                required
              />
              <select
                value={formAccount}
                onChange={(e) => setFormAccount(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 md:col-span-2"
                required
              >
                <option value="">Selecione a conta</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nickname}
                  </option>
                ))}
              </select>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Lançar
                </button>
              </div>
            </form>
            {message && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
          </div>
        </div>
      )}

      {message && !modalOpen && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
    </>
  );
}
