"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { apiFetch } from "@/lib/api";

interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
    organization: {
      id: string;
      name: string;
      role: {
        id: string;
        name: string;
        system: boolean;
        permissions: {
          id: string;
          module: string;
          action: string;
        }[];
      };
      business: unknown;
    };
  };
  error?: string;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response =
        await apiFetch<LoginResponse>(
          "/api/auth/login",
          {
            method: "POST",
            body: JSON.stringify({
              email,
              password,
            }),
          },
        );

      if (!response.data?.token) {
        throw new Error(
          "Token de connexion manquant",
        );
      }

      localStorage.setItem(
        "nexora_token",
        response.data.token,
      );

      localStorage.setItem(
        "nexora_user",
        JSON.stringify(
          response.data.user,
        ),
      );

      localStorage.setItem(
        "nexora_organization",
        JSON.stringify(
          response.data.organization,
        ),
      );

      router.push("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de se connecter",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Nexora
          </h1>

          <p className="mt-2 text-slate-400">
            Gérez votre entreprise simplement.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">
              Connexion
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Connectez-vous à votre espace Nexora.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="vous@exemple.com"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-white"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Mot de passe
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-white"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Connexion..."
                : "Se connecter"}
            </button>

            <p className="text-center text-sm text-gray-500">
                Pas encore de compte ?{" "}
                <Link
                    href="/register"
                    className="font-medium text-white hover:underline"
                >
                    Créer un compte
                </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}