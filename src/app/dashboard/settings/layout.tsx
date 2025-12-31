"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard/settings/profile", label: "Perfil" },
  { href: "/dashboard/settings/plan", label: "Plano & Cobrança" },
];

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie suas informações pessoais, plano e formas de pagamento.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-2 shadow-sm">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm transition",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
