"use client";

import { authClient } from "@/lib/auth-client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardLayout } from "../../layout";

type Tenant = { id: string; name: string };
type Card = { id: string; nickname: string };
type Transaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  isFixed?: boolean;
  createdAt: string;
  cardId?: string | null;
  referenceMonth?: string | null;
  bankAccountId?: string | null;
};

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const cardId = params?.id;
  const { data: session } = authClient.useSession();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formValue, setFormValue] = useState("");
  const [formType, setFormType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [formCategory, setFormCategory] = useState("");
  const [formMonth, setFormMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [formFixed, setFormFixed] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formTarget, setFormTarget] = useState<{
    type: "account" | "card" | "";
    id: string;
  }>({ type: "card", id: cardId || "" });
  const userId = useMemo(() => session?.user?.id, [session?.user?.id]);
  const { setConfig } = useDashboardLayout();

  useEffect(() => {
    if (!userId || !cardId) return;
    loadTenant(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, cardId]);

  async function loadTenant(ownerId: string) {
    const res = await fetch(`/api/tenant?userId=${ownerId}`);
    const raw = await res.text();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data?.tenant) {
        setTenant(data.tenant);
        await loadCard(data.tenant.id);
        await loadTransactions(data.tenant.id);
      }
    } catch {
      setMessage("Erro ao carregar tenant.");
    }
  }

  async function loadCard(tenantId: string) {
    const res = await fetch(`/api/cards?tenantId=${tenantId}`);
    const raw = await res.text();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const c = (data.cards || []).find((c: Card) => c.id === cardId);
      setCard(c || null);
    } catch {
      setMessage("Erro ao carregar cartão.");
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
        const list: Transaction[] = data.transactions || [];
        setTransactions(list.filter((t) => t.cardId === cardId));
      } catch {
        setMessage("Erro ao carregar lançamentos.");
      }
    },
    [cardId, filterMonth]
  );

  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: `Cartão ${card?.nickname || ""}`,
      month: filterMonth,
      onMonthChange: setFilterMonth,
      onRefresh: tenant ? () => loadTransactions(tenant.id) : undefined,
      message: message || undefined,
    }));
  }, [card?.nickname, filterMonth, loadTransactions, message, setConfig, tenant]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !cardId) {
      setMessage("Cartão não encontrado.");
      return;
    }
    if (!formTarget.id || !formTarget.type) {
      setMessage("Escolha conta ou cartão.");
      return;
    }
    const payload: Record<string, any> = {
      tenantId: tenant.id,
      amount: formValue,
      type: formType,
      category: formCategory,
      isFixed: formFixed,
      referenceMonth: formMonth,
    };
    if (formTarget.type === "card") payload.cardId = formTarget.id;
    if (formTarget.type === "account") payload.bankAccountId = formTarget.id;

    const url = editing
      ? `/api/transactions/${editing.id}`
      : "/api/transactions";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
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
      setEditing(null);
      setFormValue("");
      setFormCategory("");
      setFormFixed(false);
      setFormTarget({ type: "card", id: cardId || "" });
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
          Cadastre um tenant no dashboard para visualizar cartões.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-2xl border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo do cartão</p>
              <p
                className={`text-2xl font-semibold ${
                  income - expense >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                R$ {(income - expense).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                Entradas R$ {income.toFixed(2)} · Saídas R$ {expense.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Lançamentos</h2>
              <button
                onClick={() => {
                  setEditing(null);
                  setFormValue("");
                  setFormCategory("");
                  setFormFixed(false);
                  setFormMonth(filterMonth);
                  setFormTarget({ type: "card", id: cardId || "" });
                  setModalOpen(true);
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800 text-sm"
              >
                Novo lançamento
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {transactions.map((t) => (
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
                  <button
                    onClick={() => {
                      setEditing(t);
                      setFormValue(String(t.amount));
                      setFormType(t.type);
                      setFormCategory(t.category);
                      setFormMonth(
                        t.referenceMonth
                          ? t.referenceMonth.slice(0, 7)
                          : filterMonth
                      );
                      setFormFixed(!!t.isFixed);
                      if (t.bankAccountId) {
                        setFormTarget({ type: "account", id: t.bankAccountId });
                      } else if (t.cardId) {
                        setFormTarget({ type: "card", id: t.cardId });
                      } else {
                        setFormTarget({ type: "", id: "" });
                      }
                      setModalOpen(true);
                    }}
                    className="text-xs text-blue-600 underline"
                  >
                    Editar
                  </button>
                </li>
              ))}
              {transactions.length === 0 && (
                <li className="text-xs text-gray-500">
                  Nenhum lançamento para este mês.
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
              <h3 className="text-lg font-semibold">
                {editing ? "Editar lançamento" : "Novo lançamento"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Fechar
              </button>
            </div>
            <form onSubmit={handleSave} className="grid gap-3 md:grid-cols-2">
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
                placeholder="Categoria (ex: Assinaturas)"
                className="w-full rounded-lg border px-3 py-2 md:col-span-2"
                required
              />
              <select
                value={formTarget.type === "card" ? formTarget.id : ""}
                onChange={(e) =>
                  setFormTarget({ type: "card", id: e.target.value })
                }
                className="w-full rounded-lg border px-3 py-2 md:col-span-2"
              >
                <option value="">Selecionar cartão</option>
                <option value={cardId || ""}>{card?.nickname || "Atual"}</option>
              </select>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {editing ? "Salvar" : "Lançar"}
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
