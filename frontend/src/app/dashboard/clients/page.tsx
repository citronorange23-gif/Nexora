"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import BackButton from "@/components/ui/BackButton";

type Customer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomersResponse = {
  success: boolean;
  data: Customer[];
  error?: string;
};

type DeleteResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

function getCustomerName(customer: Customer) {
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Client sans nom";
}

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch<CustomersResponse>(
        "/api/customers",
      );

      setCustomers(response.data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les clients.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return customers;
    }

    return customers.filter((customer) => {
      return [
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.phone,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch));
    });
  }, [customers, search]);

  async function handleDelete(customer: Customer) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer "${getCustomerName(customer)}" ?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(customer.id);
      setError("");

      await apiFetch<DeleteResponse>(
        `/api/customers/${customer.id}`,
        { method: "DELETE" },
      );

      setCustomers((current) =>
        current.filter((item) => item.id !== customer.id),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le client.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <BackButton href="/dashboard">
          Retour au tableau de bord
        </BackButton>

        <div className="mb-8 mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-500">CRM</p>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="mt-2 text-slate-400">
              Gérez vos clients et gardez leurs informations importantes au même endroit.
            </p>
          </div>

          <Link
            href="/dashboard/clients/new"
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            + Nouveau client
          </Link>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadCustomers}
              className="font-semibold text-red-300 hover:text-white"
            >
              Réessayer
            </button>
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <label htmlFor="customer-search" className="sr-only">
            Rechercher un client
          </label>
          <input
            id="customer-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par nom, courriel ou téléphone..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 transition focus:border-white"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              Chargement de vos clients...
            </div>
          ) : customers.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                👥
              </div>
              <h2 className="mt-5 text-lg font-semibold text-white">
                Aucun client pour le moment
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                Ajoutez votre premier client pour commencer à construire votre CRM.
              </p>
              <Link
                href="/dashboard/clients/new"
                className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Ajouter mon premier client
              </Link>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <p className="font-medium text-white">Aucun résultat</p>
              <p className="mt-2 text-sm text-slate-400">
                Essaie avec un autre nom, courriel ou numéro de téléphone.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Courriel</th>
                      <th className="px-6 py-4">Téléphone</th>
                      <th className="px-6 py-4">Ajouté le</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-slate-800 last:border-0 hover:bg-slate-950/50"
                      >
                        <td className="px-6 py-5">
                          <Link
                            href={`/dashboard/clients/${customer.id}`}
                            className="font-semibold text-white hover:underline"
                          >
                            {getCustomerName(customer)}
                          </Link>
                        </td>
                        <td className="px-6 py-5 text-slate-300">
                          {customer.email || "—"}
                        </td>
                        <td className="px-6 py-5 text-slate-300">
                          {customer.phone || "—"}
                        </td>
                        <td className="px-6 py-5 text-sm text-slate-500">
                          {new Date(customer.createdAt).toLocaleDateString("fr-CA")}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/dashboard/clients/${customer.id}`}
                              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            >
                              Voir
                            </Link>
                            <Link
                              href={`/dashboard/clients/edit/${customer.id}`}
                              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            >
                              Modifier
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(customer)}
                              disabled={deletingId === customer.id}
                              className="rounded-lg border border-red-900/70 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === customer.id ? "Suppression..." : "Supprimer"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-800 md:hidden">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/clients/${customer.id}`}
                          className="font-semibold text-white hover:underline"
                        >
                          {getCustomerName(customer)}
                        </Link>
                        <p className="mt-1 text-sm text-slate-500">
                          {customer.email || "Aucun courriel"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {customer.phone && (
                        <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
                          {customer.phone}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/clients/${customer.id}`}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                      >
                        Voir
                      </Link>
                      <Link
                        href={`/dashboard/clients/edit/${customer.id}`}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                      >
                        Modifier
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(customer)}
                        disabled={deletingId === customer.id}
                        className="rounded-lg border border-red-900/70 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-950/50 disabled:opacity-50"
                      >
                        {deletingId === customer.id ? "..." : "Supprimer"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {!loading && customers.length > 0 && (
          <div className="mt-4 text-sm text-slate-500">
            {filteredCustomers.length} résultat{filteredCustomers.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </main>
  );
}
