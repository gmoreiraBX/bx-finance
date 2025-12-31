"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import type React from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { authClient } from "@/lib/auth-client";

type DashboardLayoutConfig = {
  title?: string;
  month?: string;
  onMonthChange?: (value: string) => void;
  onRefresh?: () => void;
  message?: string;
};

type DashboardLayoutContextValue = {
  setConfig: Dispatch<SetStateAction<DashboardLayoutConfig>>;
};

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(
  null
);

export function useDashboardLayout() {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) {
    throw new Error("useDashboardLayout deve ser usado dentro do dashboard layout.");
  }

  return ctx;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = authClient.useSession();
  const [config, setConfig] = useState<DashboardLayoutConfig>({ title: "" });
  const [hideUpgradeCard, setHideUpgradeCard] = useState(false);

  const providerValue = useMemo(
    () => ({ setConfig }),
    []
  );

  // Fetch billing status once to decide if the upgrade CTA should be hidden.
  useEffect(() => {
    async function checkPlan(userId: string) {
      try {
        const res = await fetch(`/api/billing?userId=${userId}`);
        const raw = await res.text();
        if (!raw) return;
        const data = JSON.parse(raw);
        const billing = data?.billing;
        const isActive =
          billing &&
          billing.planId &&
          billing.planId !== "free" &&
          (billing.status || "").toUpperCase() !== "CANCELLED";
        setHideUpgradeCard(!!isActive);
      } catch {
        // Silently ignore; fallback to showing CTA.
      }
    }
    if (session?.user?.id) {
      checkPlan(session.user.id);
    }
  }, [session?.user?.id]);

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <a href="/login" className="text-blue-300 underline">
          Faça login para acessar o dashboard
        </a>
      </div>
    );
  }

  return (
    <DashboardLayoutContext.Provider value={providerValue}>
      <DashboardShell
        title={config.title || ""}
        month={config.month}
        onMonthChange={config.onMonthChange}
        onRefresh={config.onRefresh}
        userName={session.user.name}
        userEmail={session.user.email}
        message={config.message}
        hideUpgradeCard={hideUpgradeCard}
      >
        {children}
      </DashboardShell>
    </DashboardLayoutContext.Provider>
  );
}
