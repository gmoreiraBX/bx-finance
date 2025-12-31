"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/user-menu";

type DashboardShellProps = {
  title: string;
  month?: string;
  onMonthChange?: (value: string) => void;
  onRefresh?: () => void;
  userName?: string | null;
  userEmail: string;
  children: ReactNode;
  message?: string;
  hideUpgradeCard?: boolean;
};

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/transactions", label: "Transações" },
  { href: "/dashboard/cards", label: "Cartões" },
  { href: "/dashboard/accounts", label: "Contas" },
  { href: "/dashboard/savings", label: "Poupança" },
  { href: "/dashboard/investments", label: "Investimentos" },
];

export function DashboardShell({
  title,
  month,
  onMonthChange,
  onRefresh,
  userName,
  userEmail,
  children,
  message,
  hideUpgradeCard = false,
}: DashboardShellProps) {
  const pathname = usePathname();
  const userInitial = (userName || userEmail || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100 text-gray-900 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:h-screen lg:sticky lg:top-0 w-64 flex-col bg-slate-950 text-white px-5 py-6 space-y-6">
        <div className="flex items-center gap-3">
          {/* <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-lg font-bold">
            MT
          </div> */}
          <div>
            <p className="text-sm text-white/70">Basix</p>
            <p className="text-lg font-semibold">FINANCE</p>
          </div>
        </div>
        <nav className="space-y-1 text-sm">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                  active ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        {!hideUpgradeCard && (
          <div className="flex justify-between items-start flex-col gap-4 mt-auto rounded-2xl border border-white/10 bg-linear-to-br from-purple-700 to-indigo-500 p-4 text-sm">
            <div>
              <p className="font-semibold text-white mb-1">
                Atualize para o PRO
              </p>
              <p className="text-white/80 text-xs">
                Desbloqueie insights avançados e suporte prioritário.
              </p>
            </div>
            <Link
              href="/dashboard/upgrade"
              className="w-full rounded-lg bg-white text-slate-900 text-center p-2 text-sm font-semibold"
            >
              Upgrade
            </Link>
          </div>
        )}
        <Link href="/login" className="text-sm text-white/70 hover:text-white">
          Sair
        </Link>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <header className="sticky top-0 z-10 bg-slate-100/80 backdrop-blur border-b border-slate-200">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm text-gray-500">Olá</p>
              <h1 className="text-2xl font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              {month && onMonthChange ? (
                <>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => onMonthChange(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Atualizar
                    </button>
                  )}
                </>
              ) : null}
              <UserMenu
                userName={userName || undefined}
                userEmail={userEmail}
              />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
          {children}
          {message && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {message}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
