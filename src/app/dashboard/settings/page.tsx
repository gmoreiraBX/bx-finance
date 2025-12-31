"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useDashboardLayout } from "../layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CreditCard, User } from "lucide-react";

export default function SettingsIndexPage() {
  const { setConfig } = useDashboardLayout();

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      title: "Configurações",
      month: undefined,
      onMonthChange: undefined,
      onRefresh: undefined,
      message: undefined,
    }));
  }, [setConfig]);

  const sections = [
    {
      title: "Perfil",
      description: "Dados pessoais e contato para avisos da sua conta.",
      href: "/dashboard/settings/profile",
      icon: <User className="h-4 w-4" />,
    },
    {
      title: "Plano & cobrança",
      description: "Histórico de pagamentos, links e detalhes do seu plano.",
      href: "/dashboard/settings/plan",
      icon: <CreditCard className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sections.map((section) => (
        <Card key={section.href} className="bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              {section.icon}
              {section.title}
            </CardTitle>
            <ArrowRight className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {section.description}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href={section.href}>Abrir</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
