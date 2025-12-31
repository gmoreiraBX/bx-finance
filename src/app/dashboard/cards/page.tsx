"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboardLayout } from "../layout";

type Tenant = { id: string; name: string };
type Card = { id: string; nickname: string };

export default function CardsPage() {
  const { data: session } = authClient.useSession();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [newNickname, setNewNickname] = useState("");
  const [message, setMessage] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "pix">("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [pixKey, setPixKey] = useState("finance@basix.com");
  const [paymentMessage, setPaymentMessage] = useState("");
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
        await loadCards(data.tenant.id);
      }
    } catch {
      setMessage("Erro ao carregar tenant.");
    }
  }

  async function loadCards(tenantId: string) {
    const res = await fetch(`/api/cards?tenantId=${tenantId}`);
    const raw = await res.text();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setCards(data.cards || []);
    } catch {
      setMessage("Erro ao carregar cartões.");
    }
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant.id, nickname: newNickname }),
    });
    const data = await parseResponse<{ error?: string }>(
      res,
      "Erro ao criar cartão"
    );
    if (res.ok) {
      setNewNickname("");
      await loadCards(tenant.id);
      setMessage("");
    } else if (data?.error) {
      setMessage(data.error);
    }
  }

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: "Cartões",
      month: undefined,
      onMonthChange: undefined,
      onRefresh: undefined,
      message: message || undefined,
    }));
  }, [message, setConfig]);

  function resetPaymentForm() {
    setPaymentMethod("card");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
  }

  function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (paymentMethod === "card") {
      if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        setPaymentMessage("Preencha todos os campos do cartão.");
        return;
      }
    }
    setPaymentMessage(
      paymentMethod === "pix"
        ? "Inicie o pagamento via Pix usando a chave indicada."
        : "Dados enviados para processamento. Não armazenamos seu cartão."
    );
    setPaymentModalOpen(false);
    resetPaymentForm();
  }

  return (
    <>
      {!tenant ? (
        <p className="text-sm text-gray-600">
          Cadastre um tenant no dashboard para gerenciar cartões.
        </p>
      ) : (
        <>
          <form
            onSubmit={handleCreateCard}
            className="rounded-2xl border bg-white p-4 shadow-sm space-y-3"
          >
            <p className="text-sm text-gray-600">
              Cadastre um novo cartão de crédito.
            </p>
            <input
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="Ex: Visa Corporate"
              className="w-full rounded-lg border px-3 py-2"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            >
              Adicionar cartão
            </button>
          </form>

          <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  Pagamento imediato
                </h2>
                <p className="text-sm text-gray-600">
                  Informe os dados do cartão ou escolha pagar via Pix. Não
                  armazenamos os dados do seu cartão; eles são usados apenas
                  durante o processamento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetPaymentForm();
                  setPaymentModalOpen(true);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 text-sm"
              >
                Adicionar forma de pagamento
              </button>
            </div>
            {paymentMessage && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {paymentMessage}
              </p>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Meus cartões</h2>
            <ul className="space-y-2 text-sm">
              {cards.map((card) => (
                <li
                  key={card.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 bg-gray-50"
                >
                  <span>{card.nickname}</span>
                  <Link
                    className="text-blue-600 underline"
                    href={`/dashboard/cards/${card.id}`}
                  >
                    Ver detalhes
                  </Link>
                </li>
              ))}
              {cards.length === 0 && (
                <li className="text-xs text-gray-500">
                  Nenhum cartão cadastrado.
                </li>
              )}
            </ul>
          </div>
        </>
      )}

      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Adicionar forma de pagamento
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Fechar
              </button>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Não armazenamos os dados do seu cartão. Eles são usados apenas para
              processar o pagamento de forma segura.
            </p>

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
                    Use a chave Pix abaixo para concluir o pagamento:
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
                    Assim que o pagamento for identificado, atualizaremos o
                    status automaticamente.
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Continuar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
