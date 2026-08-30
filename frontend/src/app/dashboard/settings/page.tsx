"use client";

import Link from "next/link";

type SettingsLink = {
  label: string;
  description: string;
  icon: string;
  href: string;
};

const SETTINGS_LINKS: SettingsLink[] = [
  {
    label: "Paiements",
    description: "Connecte ton compte Stripe pour accepter les paiements par carte.",
    icon: "💳",
    href: "/dashboard/settings/payments",
  },
  {
    label: "Factures",
    description: "Choisis l'adresse courriel utilisée pour les reçus envoyés aux clients.",
    icon: "🧾",
    href: "/dashboard/settings/receipts",
  },
];

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 transition hover:text-slate-300"
          >
            ← Retour au tableau de bord
          </Link>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Paramètres
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Gère la configuration de ton entreprise.
          </p>
        </div>

        <div className="space-y-3">
          {SETTINGS_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-2xl">
                {link.icon}
              </div>

              <div className="min-w-0">
                <p className="font-semibold">{link.label}</p>

                <p className="mt-0.5 text-sm text-slate-500">
                  {link.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}