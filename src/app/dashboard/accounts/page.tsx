"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboardLayout } from "../layout";

type Tenant = { id: string; name: string };
type BankAccount = { id: string; nickname: string };

export default function AccountsPage() {
  const { data: session } = authClient.useSession();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [newNickname, setNewNickname] = useState("");
  const [message, setMessage] = useState("");
  const userId = useMemo(() => session?.user?.id, [session?.user?.id]);
  const { setConfig } = useDashboardLayout();

  useEffect(() => {
    if (!userId) return;
    loadTenant(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function parseResponse<T>(
    res: Response,
    fallback: string
  ): Promise<T | null> {
    const raw = await res.text();
    if (!raw) return {} as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      setMessage(fallback);
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
        await loadAccounts(data.tenant.id);
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
    } catch {
      setMessage("Erro ao carregar contas.");
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant.id, nickname: newNickname }),
    });
    const data = await parseResponse<{ error?: string }>(
      res,
      "Erro ao criar conta"
    );
    if (res.ok) {
      setNewNickname("");
      await loadAccounts(tenant.id);
      setMessage("");
    } else if (data?.error) {
      setMessage(data.error);
    }
  }

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: "Contas",
      month: undefined,
      onMonthChange: undefined,
      onRefresh: undefined,
      message: message || undefined,
    }));
  }, [message, setConfig]);

  return (
    <>
      {!tenant ? (
        <p className="text-sm text-gray-600">
          Cadastre um tenant no dashboard para gerenciar contas.
        </p>
      ) : (
        <>
          <form
            onSubmit={handleCreateAccount}
            className="rounded-2xl border bg-white p-4 shadow-sm space-y-3"
          >
            <p className="text-sm text-gray-600">
              Cadastre uma nova conta bancária.
            </p>
            <input
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="Ex: Itaú - PJ"
              className="w-full rounded-lg border px-3 py-2"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            >
              Adicionar conta
            </button>
          </form>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Minhas contas</h2>
            <ul className="space-y-2 text-sm">
              {accounts.map((acc) => (
                <li
                  key={acc.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 bg-gray-50"
                >
                  <span>{acc.nickname}</span>
                  <Link
                    className="text-blue-600 underline"
                    href={`/dashboard/accounts/${acc.id}`}
                  >
                    Ver detalhes
                  </Link>
                </li>
              ))}
              {accounts.length === 0 && (
                <li className="text-xs text-gray-500">
                  Nenhuma conta cadastrada.
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
