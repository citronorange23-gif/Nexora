"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

import BackButton from "@/components/ui/BackButton";

type SettingsResponse = {
  success: boolean;
  data: { name: string; receiptEmail: string | null } | null;
};

export default function ReceiptSettingsPage() {
  const [receiptEmail, setReceiptEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch<SettingsResponse>(
          "/api/settings",
        );

        setReceiptEmail(response.data?.receiptEmail ?? "");
      } catch (err) {
        console.error(err);
        setError("Impossible de charger les paramètres.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function handleSave() {
    if (!receiptEmail.trim()) {
      setError("Entre un courriel valide.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await apiFetch("/api/settings/receipt-email", {
        method: "PATCH",
        body: JSON.stringify({ receiptEmail: receiptEmail.trim() }),
      });

      setSuccess("Courriel de facturation mis à jour.");
    } catch (err) {
      console.error(err);
      setError("Impossible d'enregistrer le courriel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <BackButton href="/dashboard/settings">
            Retour aux paramètres
          </BackButton>
          <h1 className="text-3xl font-bold tracking-tight">Factures</h1>

          <p className="mt-1 text-sm text-slate-400">
            Choisis l&apos;adresse courriel utilisée pour recevoir les
            réponses des clients à leurs reçus.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-green-900 bg-green-950/40 px-4 py-3 text-sm text-green-400">
            {success}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Chargement...</p>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Courriel de facturation
            </label>

            <input
              type="email"
              value={receiptEmail}
              onChange={(event) => setReceiptEmail(event.target.value)}
              placeholder="contact@monentreprise.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white"
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        )}
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="font-semibold">🖨️ Imprimer les reçus à la caisse</p>

          <p className="mt-1 text-sm text-slate-500">
            Pour imprimer les reçus directement sur ton imprimante de
            caisse, installe QZ Tray une seule fois sur l&apos;ordinateur
            de la caisse.
          </p>

          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-400">
            <li>
              Télécharge et installe QZ Tray :{" "}
              <a
                href="https://qz.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline underline-offset-2 hover:text-slate-300"
              >
                qz.io/download
              </a>
            </li>

            <li>
              Lance QZ Tray — une icône apparaît dans la barre système.
              Laisse-le tourner en arrière-plan.
            </li>

            <li>
              Ouvre la caisse dans le navigateur. Au premier chargement,
              QZ Tray demande une autorisation — clique sur
              &quot;Allow&quot; / &quot;Autoriser&quot;.
            </li>

            <li>
              Assure-toi que l&apos;imprimante de reçus est bien
              installée comme imprimante normale (format 80mm,
              marges à zéro).
            </li>

            <li>
              Définis cette imprimante comme <strong>imprimante par
              défaut</strong> sur ce poste — la caisse s&apos;en sert
              automatiquement, sans configuration supplémentaire.
            </li>
          </ol>

          <p className="mt-4 text-xs text-slate-600">
            QZ Tray démarre automatiquement avec l&apos;ordinateur après
            l&apos;installation — aucune autre manipulation nécessaire
            ensuite. Si l&apos;impression ne fonctionne pas, vérifie que
            l&apos;icône QZ Tray est bien présente dans la barre système.
          </p>
        </div>
      </div>
    </main>
  );
}