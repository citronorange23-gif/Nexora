"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { apiFetch, apiFetchBlob } from "@/lib/api";
import BackButton from "@/components/ui/BackButton";

type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "VOID";

type Customer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type Invoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  currency: string;
  issuedAt: string;
  createdAt: string;
  customer?: Customer | null;
};

type InvoicesResponse = {
  success: boolean;
  data: Invoice[];
};

type DocumentTab = "ALL" | "INVOICES" | "QUOTES" | "RECEIPTS" | "FILES";

const TABS: { key: DocumentTab; label: string }[] = [
  { key: "ALL", label: "Tous" },
  { key: "INVOICES", label: "Factures" },
  { key: "QUOTES", label: "Devis" },
  { key: "RECEIPTS", label: "Reçus" },
  { key: "FILES", label: "Fichiers" },
];

export default function DocumentsPage() {
  const [tab, setTab] = useState<DocumentTab>("ALL");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | InvoiceStatus>("ALL");

  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(
    null,
  );

  async function loadInvoices() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch<InvoicesResponse>(
        "/api/documents/invoices",
      );

      setInvoices(response.data ?? []);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const value = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      if (
        statusFilter !== "ALL" &&
        invoice.status !== statusFilter
      ) {
        return false;
      }

      if (!value) {
        return true;
      }

      const customerName = getCustomerName(
        invoice.customer,
      ).toLowerCase();

      return (
        invoice.number.toLowerCase().includes(value) ||
        customerName.includes(value) ||
        (invoice.customer?.email ?? "")
          .toLowerCase()
          .includes(value)
      );
    });
  }, [invoices, search, statusFilter]);

  async function handleOpenPdf(invoice: Invoice) {
    try {
      setPdfLoadingId(invoice.id);

      const blob = await apiFetchBlob(
        `/api/documents/invoices/${invoice.id}/pdf`,
      );

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      setError("Impossible d'ouvrir le PDF de la facture.");
    } finally {
      setPdfLoadingId(null);
    }
  }

  function formatMoney(value: number | string) {
    return `${Number(value).toFixed(2)} $`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("fr-CA", {
      dateStyle: "medium",
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <BackButton href="/dashboard">
          Retour au dashboard
        </BackButton>

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Documents
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Centralise les factures, devis, reçus et fichiers de
              ton entreprise.
            </p>
          </div>

          <button
            type="button"
            onClick={loadInvoices}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            ↻ Actualiser
          </button>
        </div>

        {/* MESSAGES */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* TABS */}

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === item.key
                  ? "bg-white text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab !== "ALL" && tab !== "INVOICES" ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 py-16 text-center">
            <p className="text-lg font-medium text-white">
              Bientôt disponible
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {tab === "QUOTES" &&
                "La gestion des devis arrive dans une prochaine mise à jour."}
              {tab === "RECEIPTS" &&
                "Les reçus détaillés arrivent dans une prochaine mise à jour."}
              {tab === "FILES" &&
                "L'import de fichiers arrive dans une prochaine mise à jour."}
            </p>
          </div>
        ) : (
          <>
            {/* FILTRES */}

            <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Rechercher
                  </label>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Numéro, client..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 transition focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Statut
                  </label>

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value as
                          | "ALL"
                          | InvoiceStatus,
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-white"
                  >
                    <option value="ALL">Tous</option>
                    <option value="DRAFT">Brouillon</option>
                    <option value="ISSUED">Émise</option>
                    <option value="PAID">Payée</option>
                    <option value="VOID">Annulée</option>
                  </select>
                </div>
              </div>
            </section>

            {loading ? (
              <p className="text-slate-400">
                Chargement des documents...
              </p>
            ) : filteredInvoices.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 py-16 text-center">
                <p className="text-lg font-medium text-white">
                  Aucune facture trouvée
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Les factures sont générées automatiquement à
                  partir des ventes payées.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Numéro</th>
                      <th className="px-5 py-3">Client</th>
                      <th className="px-5 py-3">Statut</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">
                        Montant
                      </th>
                      <th className="px-5 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800 bg-slate-950">
                    {filteredInvoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="transition hover:bg-slate-900/60"
                      >
                        <td className="px-5 py-4 font-mono text-xs text-white">
                          {invoice.number}
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {getCustomerName(invoice.customer)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={invoice.status} />
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatDate(invoice.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-white">
                          {formatMoney(invoice.total)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/dashboard/documents/${invoice.id}`}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            >
                              Voir
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleOpenPdf(invoice)}
                              disabled={pdfLoadingId === invoice.id}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {pdfLoadingId === invoice.id
                                ? "..."
                                : "PDF"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config: Record<
    InvoiceStatus,
    { label: string; className: string }
  > = {
    DRAFT: {
      label: "Brouillon",
      className:
        "border-slate-700 bg-slate-800/60 text-slate-300",
    },
    ISSUED: {
      label: "Émise",
      className:
        "border-sky-900 bg-sky-950/40 text-sky-400",
    },
    PAID: {
      label: "Payée",
      className:
        "border-emerald-900 bg-emerald-950/40 text-emerald-400",
    },
    VOID: {
      label: "Annulée",
      className: "border-red-900 bg-red-950/40 text-red-400",
    },
  };

  const { label, className } = config[status];

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function getCustomerName(customer?: Customer | null) {
  if (!customer) {
    return "Client comptant";
  }

  const name = `${customer.firstName ?? ""} ${
    customer.lastName ?? ""
  }`.trim();

  return name || customer.email || "Client";
}
