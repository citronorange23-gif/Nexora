"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import BackButton from "@/components/ui/BackButton";

type Customer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

type CustomerResponse = {
  success: boolean;
  data: Customer;
  error?: string;
};

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
};

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    async function loadCustomer() {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch<CustomerResponse>(
          `/api/customers/${customerId}`,
        );

        setForm({
          firstName: response.data.firstName ?? "",
          lastName: response.data.lastName ?? "",
          email: response.data.email ?? "",
          phone: response.data.phone ?? "",
          notes: response.data.notes ?? "",
        });
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Impossible de récupérer le client.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [customerId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiFetch<CustomerResponse>(`/api/customers/${customerId}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });

      router.push(`/dashboard/clients/${customerId}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le client.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Chargement du client...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <BackButton href={`/dashboard/clients/${customerId}`}>
          Retour au client
        </BackButton>

        <div className="mb-8 mt-6">
          <p className="mb-1 text-sm font-medium text-slate-500">CRM</p>
          <h1 className="text-3xl font-bold tracking-tight">Modifier le client</h1>
          <p className="mt-2 text-slate-400">
            Mettez à jour les informations de ce client.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-slate-300">
                Prénom
              </label>
              <input
                id="firstName"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                maxLength={100}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-white"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-slate-300">
                Nom
              </label>
              <input
                id="lastName"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                maxLength={100}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-white"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                Courriel
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                maxLength={255}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-white"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-300">
                Téléphone
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                maxLength={30}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="mb-2 block text-sm font-medium text-slate-300">
              Notes
            </label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              maxLength={1000}
              rows={5}
              className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/clients/${customerId}`)}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
