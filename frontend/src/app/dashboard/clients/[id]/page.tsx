"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import BackButton from "@/components/ui/BackButton";

import ConfirmationModal from "@/components/ui/ConfirmationModal";

type SaleItem = {
  id: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  product: { id: string; name: string };
};

type Sale = {
  id: string;
  status: "COMPLETED" | "CANCELLED" | "REFUNDED";
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  createdAt: string;
  items: SaleItem[];
  payment: {
    method: "CASH" | "CARD" | "INTERAC" | "OTHER";
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    amount: number | string;
  } | null;
};

type Customer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sales: Sale[];
};

type CustomerResponse = {
  success: boolean;
  data: Customer;
  error?: string;
};

function getCustomerName(customer: Customer) {
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Client sans nom";
}

function money(value: number | string) {
  return `${Number(value).toFixed(2)} $`;
}

export default function ClientDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function loadCustomer() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch<CustomerResponse>(
        `/api/customers/${customerId}`,
      );

      setCustomer(response.data);
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

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  function handleDelete() {
    if (!customer) return;

    setShowDeleteModal(true);
  }

  async function confirmDelete() {
  if (!customer) return;

  try {
    setDeleting(true);
    setError("");
    setShowDeleteModal(false);

    await apiFetch(`/api/customers/${customer.id}`, {
      method: "DELETE",
    });

    router.push("/dashboard/clients");
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Impossible de supprimer le client.",
    );
  } finally {
    setDeleting(false);
  }
}

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Chargement du client...
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <BackButton href="/dashboard/clients">Retour aux clients</BackButton>
          <div className="mt-8 rounded-2xl border border-red-900 bg-red-950/30 p-6 text-red-400">
            {error || "Client introuvable."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      {showDeleteModal && customer && (
        <ConfirmationModal
          text={`Voulez-vous vraiment supprimer "${getCustomerName(customer)}" ?`}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
          confirmText="Supprimer"
          cancelText="Retour"
        />
      )}
      <div className="mx-auto w-full max-w-5xl">
        <BackButton href="/dashboard/clients">Retour aux clients</BackButton>

        <div className="mb-8 mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-500">CRM</p>
            <h1 className="text-3xl font-bold tracking-tight">
              {getCustomerName(customer)}
            </h1>
            <p className="mt-2 text-slate-400">
              Client depuis {new Date(customer.createdAt).toLocaleDateString("fr-CA")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/clients/edit/${customer.id}`}
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Modifier
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl border border-red-900/70 px-4 py-3 font-semibold text-red-400 transition hover:bg-red-950/50 disabled:opacity-50"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-1">
            <h2 className="text-lg font-semibold">Informations</h2>

            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Prénom</dt>
                <dd className="mt-1 text-slate-200">{customer.firstName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Nom</dt>
                <dd className="mt-1 text-slate-200">{customer.lastName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Courriel</dt>
                <dd className="mt-1 break-all text-slate-200">{customer.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Téléphone</dt>
                <dd className="mt-1 text-slate-200">{customer.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-300">{customer.notes || "Aucune note"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Historique des ventes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Les 20 dernières ventes associées à ce client.
                </p>
              </div>
              <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300">
                {customer.sales.length}
              </span>
            </div>

            {customer.sales.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-500">
                Aucune vente associée à ce client.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {customer.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">Vente #{sale.id.slice(0, 8)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(sale.createdAt).toLocaleString("fr-CA")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">{money(sale.total)}</p>
                        <p className="mt-1 text-xs text-slate-500">{sale.status}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1 border-t border-slate-800 pt-3">
                      {sale.items.map((item) => (
                        <div key={item.id} className="flex justify-between gap-4 text-sm">
                          <span className="text-slate-400">
                            {item.quantity} × {item.product.name}
                          </span>
                          <span className="text-slate-300">{money(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>

                    {sale.payment && (
                      <p className="mt-3 text-xs text-slate-500">
                        Paiement : {sale.payment.method} · {sale.payment.status}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
