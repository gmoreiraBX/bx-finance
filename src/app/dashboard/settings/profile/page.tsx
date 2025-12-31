"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useDashboardLayout } from "../../layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Profile = {
  id: string;
  userId: string;
  fullName?: string | null;
  phone?: string | null;
  document?: string | null;
  company?: string | null;
  timezone?: string | null;
};

export default function ProfileSettingsPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const { setConfig } = useDashboardLayout();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [company, setCompany] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: "Configurações • Perfil",
      month: undefined,
      onMonthChange: undefined,
      onRefresh: undefined,
      message: message || undefined,
    }));
  }, [message, setConfig]);

  useEffect(() => {
    if (!userId) return;
    loadProfile(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadProfile(userId: string) {
    try {
      const res = await fetch(`/api/profile?userId=${userId}`);
      const raw = await res.text();
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.profile) {
        const p: Profile = data.profile;
        setProfile(p);
        setFullName(p.fullName || session?.user?.name || "");
        setPhone(p.phone || "");
        setDocument(p.document || "");
        setCompany(p.company || "");
        setTimezone(p.timezone || "America/Sao_Paulo");
      }
    } catch {
      setMessage("Não foi possível carregar o perfil.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setMessage("Faça login para atualizar seu perfil.");
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fullName,
          phone,
          document,
          company,
          timezone,
        }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (res.ok) {
        setProfile(data.profile);
        setMessage("Perfil atualizado com sucesso.");
      } else {
        setMessage(data?.error || "Não foi possível salvar o perfil.");
      }
    } catch {
      setMessage("Erro ao salvar o perfil.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      )}

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Dados do perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Nome completo
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Telefone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="+55 (DDD) 90000-0000"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Documento
              </label>
              <input
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="CPF/CNPJ"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Empresa
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Empresa ou área"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Fuso horário
              </label>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="America/Sao_Paulo"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                E-mail (somente leitura)
              </label>
              <input
                value={session?.user?.email || ""}
                readOnly
                className="mt-1 w-full rounded-lg border bg-slate-50 px-3 py-2 text-slate-600"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {isSaving ? "Salvando..." : "Salvar perfil"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
