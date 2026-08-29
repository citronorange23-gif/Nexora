// frontend/src/app/dashboard/settings/payments/page.tsx

"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type ConnectStatusResponse = {
  success: boolean;
  data: {
    connected: boolean;
    stripeAccountId: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirements: {
      currentlyDue: string[];
      eventuallyDue: string[];
      pastDue: string[];
    } | null;
  };
};

type OnboardingLinkResponse = {
  success: boolean;
  data: {
    url: string;
    stripeAccountId: string;
  };
};

export default function StripeSettingsPage() {
  const [status, setStatus] = useState<ConnectStatusResponse["data"] | null>(null);

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStatus() {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch<ConnectStatusResponse>(
          "/api/payments/connect/status",
        );

        setStatus(response.data);
      } catch (err) {
        console.error(err);

        setError(
          "Impossible de récupérer le statut de votre compte Stripe.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  async function handleConnect() {
    try {
      setConnecting(true);
      setError("");

      const returnUrl = `${window.location.origin}/dashboard/settings/payments?onboarding=complete`;
      const refreshUrl = `${window.location.origin}/dashboard/settings/payments?onboarding=refresh`;

      const response = await apiFetch<OnboardingLinkResponse>(
        "/api/payments/connect",
        {
          method: "POST",
          body: JSON.stringify({
            returnUrl,
            refreshUrl,
          }),
        },
      );

      window.location.href = response.data.url;
    } catch (err) {
      console.error(err);

      setError(
        "Impossible de démarrer la configuration Stripe.",
      );

      setConnecting(false);
    }
  }

  const fullySetup =
    status?.chargesEnabled && status?.payoutsEnabled;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Paiements
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Connecte ton compte Stripe pour accepter les paiements
            par carte.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Chargement...</p>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-semibold">Compte Stripe</p>

                <p className="mt-1 text-sm text-slate-500">
                  {status?.connected
                    ? status.stripeAccountId
                    : "Aucun compte connecté"}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  fullySetup
                    ? "bg-green-950/60 text-green-400"
                    : status?.connected
                      ? "bg-yellow-950/60 text-yellow-400"
                      : "bg-slate-800 text-slate-400"
                }`}
              >
                {fullySetup
                  ? "Actif"
                  : status?.connected
                    ? "Configuration incomplète"
                    : "Non connecté"}
              </span>
            </div>

            {status?.connected && (
              <div className="mb-5 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-slate-500">Paiements</p>
                  <p className="mt-1 font-semibold">
                    {status.chargesEnabled ? "Activés" : "Inactifs"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-slate-500">Versements</p>
                  <p className="mt-1 font-semibold">
                    {status.payoutsEnabled ? "Activés" : "Inactifs"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-slate-500">Infos</p>
                  <p className="mt-1 font-semibold">
                    {status.detailsSubmitted
                      ? "Complètes"
                      : "Incomplètes"}
                  </p>
                </div>
              </div>
            )}

            {status?.requirements &&
              status.requirements.currentlyDue.length > 0 && (
                <div className="mb-5 rounded-xl border border-yellow-900 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-400">
                  <p className="font-medium">
                    Informations requises par Stripe :
                  </p>

                  <ul className="mt-2 list-disc pl-5">
                    {status.requirements.currentlyDue.map(
                      (item) => (
                        <li key={item}>{item}</li>
                      ),
                    )}
                  </ul>
                </div>
              )}

            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connecting
                ? "Redirection vers Stripe..."
                : status?.connected && !fullySetup
                  ? "Continuer la configuration"
                  : status?.connected
                    ? "Gérer mon compte Stripe"
                    : "Connecter mon compte Stripe"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}