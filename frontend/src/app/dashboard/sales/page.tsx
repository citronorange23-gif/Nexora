"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import BackButton from "@/components/ui/BackButton"
import ConfirmationModal from "@/components/ui/ConfirmationModal";

type SaleStatus = "COMPLETED" | "CANCELLED" | "REFUNDED";

type PaymentMethod =
  | "CASH"
  | "CARD"
  | "INTERAC"
  | "OTHER";

type PaymentStatus = "PAID" | "REFUNDED";

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
  barcode?: string | null;
  price: number | string;
  type?: "PRODUCT" | "SERVICE";
};

type SaleItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  product: Product;
};

type Payment = {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number | string;
};

type Sale = {
  id: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  status: SaleStatus;
  createdAt: string;
  customer?: Customer | null;
  items: SaleItem[];
  payment?: Payment | null;
};

type SalesResponse = {
  success: boolean;
  data: Sale[];
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(
    null,
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | SaleStatus>("ALL");

  const [confirmation, setConfirmation] = useState<{
    text: string;
    action: "cancel" | "refund";
    sale: Sale;
  } | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadSales() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch<SalesResponse>("/api/sales");

      setSales(response.data ?? []);
    } catch (error) {
      console.error(error);
      setError("Impossible de charger les ventes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = useMemo(() => {
    const value = search.trim().toLowerCase();

    return sales.filter((sale) => {
      if (
        statusFilter !== "ALL" &&
        sale.status !== statusFilter
      ) {
        return false;
      }

      if (!value) {
        return true;
      }

      const customerName = getCustomerName(
        sale.customer,
      ).toLowerCase();

      const customerEmail =
        sale.customer?.email?.toLowerCase() ?? "";

      const customerPhone =
        sale.customer?.phone?.toLowerCase() ?? "";

      const saleId = sale.id.toLowerCase();

      const products = sale.items
        .map((item) => item.product.name.toLowerCase())
        .join(" ");

      return (
        saleId.includes(value) ||
        customerName.includes(value) ||
        customerEmail.includes(value) ||
        customerPhone.includes(value) ||
        products.includes(value)
      );
    });
  }, [sales, search, statusFilter]);

  const statistics = useMemo(() => {
    const completedSales = sales.filter(
      (sale) => sale.status === "COMPLETED",
    );

    const totalRevenue = completedSales.reduce(
      (total, sale) => total + Number(sale.total),
      0,
    );

    const totalItems = completedSales.reduce(
      (total, sale) =>
        total +
        sale.items.reduce(
          (items, item) => items + item.quantity,
          0,
        ),
      0,
    );

    return {
      totalSales: sales.length,
      completedSales: completedSales.length,
      totalRevenue,
      totalItems,
    };
  }, [sales]);

  function handleCancel(sale: Sale) {
    if (sale.status !== "COMPLETED") {
        return;
    }

    setConfirmation({
        text: "Voulez-vous vraiment annuler cette vente ? Le stock sera remis.",
        action: "cancel",
        sale,
    });
  }

  function handleRefund(sale: Sale) {
    if (sale.status !== "COMPLETED") {
        return;
    }

    setConfirmation({
        text: "Voulez-vous vraiment rembourser cette vente ? Le stock sera remis.",
        action: "refund",
        sale,
    });
  }

  async function confirmAction() {
  if (!confirmation) {
    return;
  }

  const { action, sale } = confirmation;

  try {
    setActionLoading(`${action}-${sale.id}`);
    setError("");
    setSuccess("");
    setConfirmation(null);

    await apiFetch(
      `/api/sales/${sale.id}/${action}`,
      {
        method: "POST",
      },
    );

    setSuccess(
      action === "cancel"
        ? "Vente annulée avec succès."
        : "Vente remboursée avec succès.",
    );

    await loadSales();
  } catch (error) {
    console.error(error);

    setError(
      action === "cancel"
        ? "Impossible d'annuler cette vente."
        : "Impossible de rembourser cette vente.",
    );
  } finally {
    setActionLoading(null);
  }
}

  function formatMoney(value: number | string) {
    return `${Number(value).toFixed(2)} $`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("fr-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getPaymentLabel(
    method?: PaymentMethod,
  ) {
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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">
            Chargement des ventes...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        {confirmation && (
            <ConfirmationModal
                text={confirmation.text}
                onConfirm={confirmAction}
                onCancel={() => setConfirmation(null)}
                loading={
                actionLoading ===
                `${confirmation.action}-${confirmation.sale.id}`
                }
                confirmText={
                confirmation.action === "cancel"
                    ? "Annuler la vente"
                    : "Rembourser"
                }
                cancelText="Retour"
            />
        )}

    <div className="mx-auto max-w-7xl">

        <BackButton href="/dashboard">
            Retour au dashboard
        </BackButton>

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Ventes
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Consulte et gère les ventes de ton entreprise.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSales}
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

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {/* STATISTIQUES */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            label="Ventes"
            value={statistics.totalSales}
          />

          <StatCard
            label="Ventes complétées"
            value={statistics.completedSales}
          />

          <StatCard
            label="Chiffre d'affaires"
            value={formatMoney(
              statistics.totalRevenue,
            )}
          />

          <StatCard
            label="Articles vendus"
            value={statistics.totalItems}
          />

        </div>

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
                placeholder="ID, client, produit..."
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
                      | SaleStatus,
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-white"
              >
                <option value="ALL">
                  Tous
                </option>

                <option value="COMPLETED">
                  Complétées
                </option>

                <option value="CANCELLED">
                  Annulées
                </option>

                <option value="REFUNDED">
                  Remboursées
                </option>
              </select>
            </div>

          </div>

        </section>

        {/* RESULTATS */}

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {filteredSales.length} vente
            {filteredSales.length > 1 ? "s" : ""}
          </p>
        </div>

        {filteredSales.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 py-16 text-center">
            <p className="text-lg font-medium text-white">
              Aucune vente trouvée
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Modifie ta recherche ou crée une nouvelle vente
              depuis la caisse.
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {filteredSales.map((sale) => {
              const customerName =
                getCustomerName(sale.customer);

              const itemCount =
                sale.items.reduce(
                  (total, item) =>
                    total + item.quantity,
                  0,
                );

              const cancelLoading =
                actionLoading ===
                `cancel-${sale.id}`;

              const refundLoading =
                actionLoading ===
                `refund-${sale.id}`;

              return (
                <article
                  key={sale.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >

                  {/* SALE HEADER */}

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                    <div>
                      <div className="flex flex-wrap items-center gap-3">

                        <h2 className="font-mono text-sm font-semibold text-white">
                          #{sale.id}
                        </h2>

                        <StatusBadge
                          status={sale.status}
                        />

                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {formatDate(sale.createdAt)}
                      </p>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-2xl font-bold text-white">
                        {formatMoney(sale.total)}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {itemCount} article
                        {itemCount > 1 ? "s" : ""}
                      </p>
                    </div>

                  </div>

                  <div className="my-5 border-t border-slate-800" />

                  {/* INFOS */}

                  <div className="grid gap-5 md:grid-cols-3">

                    {/* CLIENT */}

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Client
                      </p>

                      <p className="mt-2 font-medium text-white">
                        {customerName}
                      </p>

                      {sale.customer?.email && (
                        <p className="mt-1 text-sm text-slate-500">
                          {sale.customer.email}
                        </p>
                      )}

                      {sale.customer?.phone && (
                        <p className="mt-1 text-sm text-slate-500">
                          {sale.customer.phone}
                        </p>
                      )}
                    </div>

                    {/* PAIEMENT */}

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Paiement
                      </p>

                      <p className="mt-2 font-medium text-white">
                        {getPaymentLabel(
                          sale.payment?.method,
                        )}
                      </p>

                      {sale.payment && (
                        <p className="mt-1 text-sm text-slate-500">
                          {formatMoney(
                            sale.payment.amount,
                          )}{" "}
                          ·{" "}
                          {sale.payment.status ===
                          "PAID"
                            ? "Payé"
                            : "Remboursé"}
                        </p>
                      )}
                    </div>

                    {/* MONTANTS */}

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Montants
                      </p>

                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">
                            Sous-total
                          </span>

                          <span>
                            {formatMoney(
                              sale.subtotal,
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">
                            Taxes
                          </span>

                          <span>
                            {formatMoney(sale.tax)}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* PRODUITS */}

                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50">

                    <div className="border-b border-slate-800 px-4 py-3">
                      <p className="text-sm font-medium text-slate-300">
                        Produits
                      </p>
                    </div>

                    <div className="divide-y divide-slate-800">

                      {sale.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 px-4 py-3"
                        >

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {item.product.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.quantity} ×{" "}
                              {formatMoney(
                                item.unitPrice,
                              )}
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-semibold text-white">
                            {formatMoney(
                              item.totalPrice,
                            )}
                          </p>

                        </div>
                      ))}

                    </div>

                  </div>

                  {/* ACTIONS */}

                  {sale.status === "COMPLETED" && (
                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">

                      <button
                        type="button"
                        onClick={() =>
                          handleCancel(sale)
                        }
                        disabled={
                          cancelLoading ||
                          refundLoading
                        }
                        className="rounded-xl border border-red-900 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancelLoading
                          ? "Annulation..."
                          : "Annuler la vente"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleRefund(sale)
                        }
                        disabled={
                          cancelLoading ||
                          refundLoading
                        }
                        className="rounded-xl border border-amber-900 px-4 py-2.5 text-sm font-medium text-amber-400 transition hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {refundLoading
                          ? "Remboursement..."
                          : "Rembourser"}
                      </button>

                    </div>
                  )}

                </article>
              );
            })}

          </div>
        )}

      </div>
    </main>
  );
}

/*
 * =====================================================
 * STAT CARD
 * =====================================================
 */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

/*
 * =====================================================
 * STATUS BADGE
 * =====================================================
 */

function StatusBadge({
  status,
}: {
  status: SaleStatus;
}) {
  const config = {
    COMPLETED: {
      label: "Complétée",
      className:
        "border-emerald-900 bg-emerald-950/40 text-emerald-400",
    },

    CANCELLED: {
      label: "Annulée",
      className:
        "border-red-900 bg-red-950/40 text-red-400",
    },

    REFUNDED: {
      label: "Remboursée",
      className:
        "border-amber-900 bg-amber-950/40 text-amber-400",
    },
  }[status];

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

/*
 * =====================================================
 * CUSTOMER NAME
 * =====================================================
 */

function getCustomerName(
  customer?: Customer | null,
) {
  if (!customer) {
    return "Client comptant";
  }

  const name = `${customer.firstName ?? ""} ${
    customer.lastName ?? ""
  }`.trim();

  return (
    name ||
    customer.email ||
    customer.phone ||
    "Client"
  );
}