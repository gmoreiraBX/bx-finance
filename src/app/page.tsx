"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      router.replace("/dashboard");
    }
  }, [router, session?.user]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <a href="/login" className="text-blue-600 underline">
        Entrar
      </a>
    </div>
  );
}
