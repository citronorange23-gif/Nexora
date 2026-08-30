"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { apiFetch, apiFetchBlob } from "@/lib/api";
import BackButton from "@/components/ui/BackButton";

type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "VOID";

type Customer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

type Product = {
  id: string;
  name: string;
};

type SaleItem = {
  id: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  product: Product;
};

type Payment = {
  method: "CASH" | "CARD" | "INTERAC" | "OTHER";
  status: string;
  amount: number | string;
};

type Sale = {
  id: string;
  items: SaleItem[];
  payment?: Payment | null;
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
  sale: Sale;
};

type InvoiceResponse = {
  success: boolean;
  data: Invoice;
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInvoice() {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch<InvoiceResponse>(
          `/api/documents/invoices/${id}`,
        );

        if (!cancelled) {
          setInvoice(response.data);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError("Impossible de charger cette facture.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInvoice();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  async function ensurePdfUrl() {
    if (pdfUrl) {
      return pdfUrl;
    }

    const blob = await apiFetchBlob(
      `/api/documents/invoices/${id}/pdf`,
    );

    const url = URL.createObjectURL(blob);
    setPdfUrl(url);

    return url;
  }

  async function handleDownload() {
    try {
      setPdfLoading(true);

      const url = await ensurePdfUrl();

      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice?.number ?? "facture"}.pdf`;
      link.click();
    } catch (err) {
      console.error(err);
      setError("Impossible de télécharger le PDF.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handlePrint() {
    try {
      setPdfLoading(true);

      const url = await ensurePdfUrl();

      const win = window.open(url, "_blank");
      win?.addEventListener("load", () => win.print());
    } catch (err) {
      console.error(err);
      setError("Impossible d'ouvrir le PDF pour l'impression.");
    } finally {
      setPdfLoading(false);
    }
  }

  function formatMoney(value: number | string) {
    return `${Number(value).toFixed(2)} $`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("fr-CA", {
      dateStyle: "long",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-slate-400">
            Chargement de la facture...
          </p>
        </div>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <BackButton href="/dashboard/documents">
            Retour aux documents
          </BackButton>

          <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error || "Facture introuvable."}
          </div>
        </div>
      </main>
    );
  }

  const customerName = invoice.customer
    ? `${invoice.customer.firstName ?? ""} ${
        invoice.customer.lastName ?? ""
      }`.trim() || invoice.customer.email || "Client"
    : "Client comptant";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <BackButton href="/dashboard/documents">
          Retour aux documents
        </BackButton>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          {/* HEADER */}

          <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-xl font-semibold text-white">
                  {invoice.number}
                </h1>

                <StatusBadge status={invoice.status} />
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Émise le {formatDate(invoice.issuedAt)}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={pdfLoading}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Télécharger PDF
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={pdfLoading}
                className="rounded-xl border border-white bg-white px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Imprimer
              </button>
            </div>
          </div>

          {/* CLIENT / PAIEMENT */}

          <div className="grid gap-6 border-b border-slate-800 py-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Facturé à
              </p>

              <p className="mt-2 font-medium text-white">
                {customerName}
              </p>

              {invoice.customer?.email && (
                <p className="mt-1 text-sm text-slate-500">
                  {invoice.customer.email}
                </p>
              )}

              {invoice.customer?.phone && (
                <p className="mt-1 text-sm text-slate-500">
                  {invoice.customer.phone}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Paiement
              </p>

              <p className="mt-2 font-medium text-white">
                {getPaymentLabel(invoice.sale.payment?.method)}
              </p>

              {invoice.sale.payment && (
                <p className="mt-1 text-sm text-slate-500">
                  {formatMoney(invoice.sale.payment.amount)} ·{" "}
                  {invoice.sale.payment.status === "PAID"
                    ? "Payé"
                    : invoice.sale.payment.status}
                </p>
              )}
            </div>
          </div>

          {/* PRODUITS */}

          <div className="py-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Articles
            </p>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <div className="divide-y divide-slate-800">
                {invoice.sale.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 bg-slate-950/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {item.product.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.quantity} ×{" "}
                        {formatMoney(item.unitPrice)}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold text-white">
                      {formatMoney(item.totalPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TOTAUX */}

          <div className="ml-auto max-w-xs space-y-2 border-t border-slate-800 pt-6 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Sous-total</span>
              <span>{formatMoney(invoice.subtotal)}</span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Taxes</span>
              <span>{formatMoney(invoice.tax)}</span>
            </div>

            <div className="flex justify-between border-t border-slate-800 pt-2 text-base font-semibold text-white">
              <span>Total</span>
              <span>{formatMoney(invoice.total)}</span>
            </div>
          </div>
        </div>
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
      className: "border-sky-900 bg-sky-950/40 text-sky-400",
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

function getPaymentLabel(method?: Payment["method"]) {
  switch (method) {
    case "CASH":
      return "Comptant";
    case "CARD":
      return "Carte";
    case "INTERAC":
      return "Interac";
    case "OTHER":
      return "Autre";
    default:
      return "Aucun";
  }
}
