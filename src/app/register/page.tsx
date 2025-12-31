"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await authClient.signUp.email(
      {
        email,
        password,
        name,
        callbackURL: "/dashboard",
      },
      {
        onRequest: (ctx) => {
          setMessage("Entrando...");
        },
        onSuccess: (ctx) => {
          router.push("/dashboard");
        },
        onError: (ctx) => {
          console.log(ctx.error.message);
        },
      }
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-96 space-y-4"
      >
        <h1 className="text-2xl font-semibold text-center">Entrar</h1>
        <input
          type="text"
          placeholder="Seu nome aqui..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-lg p-2"
          required
        />
        <input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-2"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg p-2"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Entrar
        </button>
        <p className="text-sm text-center text-gray-500">{message}</p>
      </form>
    </div>
  );
}
