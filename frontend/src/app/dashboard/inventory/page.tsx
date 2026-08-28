"use client";

import BackButton from "@/components/ui/BackButton";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

import Link from "next/link";

type Inventory = {
  id: string;
  productId: string;
  quantity: number;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  active: boolean;
  inventory: Inventory;
};

type Movement = {
  id: string;
  type: "PURCHASE" | "SALE" | "ADJUSTMENT";
  quantity: number;
  reason: string | null;
  createdAt: string;
};

type InventoryResponse = {
  success: boolean;
  data: Product[];
  error?: string;
};

type MovementsResponse = {
  success: boolean;
  data: Movement[];
  error?: string;
};

type Action = "add" | "remove" | "adjust";

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "ALL" | "IN_STOCK" | "LOW" | "OUT"
  >("ALL");

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [action, setAction] = useState<Action | null>(
    null,
  );

  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const [actionLoading, setActionLoading] =
    useState(false);

  const [movements, setMovements] = useState<
    Movement[]
  >([]);

  const [movementsLoading, setMovementsLoading] =
    useState(false);

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const response =
        await apiFetch<InventoryResponse>(
          "/api/inventory",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem(
                "nexora_token",
              )}`,
            },
          },
        );

      setProducts(response.data ?? []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de charger le stock.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        product.sku
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        product.barcode
          ?.toLowerCase()
          .includes(normalizedSearch);

      const stock = product.inventory.quantity;

      let matchesFilter = true;

      if (filter === "IN_STOCK") {
        matchesFilter = stock > 5;
      }

      if (filter === "LOW") {
        matchesFilter = stock > 0 && stock <= 5;
      }

      if (filter === "OUT") {
        matchesFilter = stock === 0;
      }

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const totalProducts = products.length;

  const totalQuantity = products.reduce(
    (total, product) =>
      total + product.inventory.quantity,
    0,
  );

  const lowStockCount = products.filter(
    (product) =>
      product.inventory.quantity > 0 &&
      product.inventory.quantity <= 5,
  ).length;

  const outOfStockCount = products.filter(
    (product) =>
      product.inventory.quantity === 0,
  ).length;

  function getStockStatus(quantity: number) {
    if (quantity === 0) {
      return {
        label: "Rupture",
        className:
          "bg-red-500/10 text-red-400 border-red-500/20",
      };
    }

    if (quantity <= 5) {
      return {
        label: "Stock faible",
        className:
          "bg-amber-500/10 text-amber-400 border-amber-500/20",
      };
    }

    return {
      label: "En stock",
      className:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  }

  function openAction(
    product: Product,
    selectedAction: Action,
  ) {
    setSelectedProduct(product);
    setAction(selectedAction);
    setQuantity("");
    setReason("");
  }

  function closeAction() {
    if (actionLoading) return;

    setAction(null);
    setSelectedProduct(null);
    setQuantity("");
    setReason("");
  }

  async function handleStockAction() {
    if (!selectedProduct || !action) {
      return;
    }

    const parsedQuantity =
      Number(quantity);

    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError(
        "Entre une quantité valide.",
      );
      return;
    }

    if (
      action === "adjust" &&
      !Number.isInteger(parsedQuantity)
    ) {
      setError(
        "La quantité doit être un nombre entier.",
      );
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const endpoint =
        action === "add"
          ? `/api/inventory/${selectedProduct.id}/add`
          : action === "remove"
            ? `/api/inventory/${selectedProduct.id}/remove`
            : `/api/inventory/${selectedProduct.id}/adjust`;

      const body =
        action === "adjust"
          ? {
              quantity: parsedQuantity,
              reason:
                reason.trim() || undefined,
            }
          : {
              quantity: parsedQuantity,
              reason:
                reason.trim() || undefined,
            };

      await apiFetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "nexora_token",
          )}`,
        },
        body: JSON.stringify(body),
      });

      closeAction();

      await loadInventory();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le stock.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function loadMovements(
    product: Product,
  ) {
    try {
      setMovementsLoading(true);
      setError("");

      const response =
        await apiFetch<MovementsResponse>(
          `/api/inventory/${product.id}/movements`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem(
                "nexora_token",
              )}`,
            },
          },
        );

      setMovements(response.data ?? []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de charger l'historique.",
      );
    } finally {
      setMovementsLoading(false);
    }
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setAction(null);
    setMovements([]);
    loadMovements(product);
  }

  function closeProduct() {
    setSelectedProduct(null);
    setAction(null);
    setMovements([]);
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(
      "fr-CA",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ).format(new Date(date));
  }

  function getMovementLabel(
    type: Movement["type"],
  ) {
    if (type === "PURCHASE") {
      return "Ajout de stock";
    }

    if (type === "SALE") {
      return "Sortie de stock";
    }

    return "Correction";
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">

        {/* RETOUR */}
        <BackButton href="/dashboard">
          Retour au tableau de bord
        </BackButton>

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="mb-1 text-sm font-medium text-slate-500">
              Gestion
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Stock
            </h1>

            <p className="mt-2 text-slate-400">
              Gardez un œil sur vos produits et
              leurs quantités.
            </p>
          </div>

          <button
            onClick={loadInventory}
            disabled={loading}
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading
              ? "Actualisation..."
              : "↻ Actualiser"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <span>{error}</span>

            <button
              onClick={() => setError("")}
              className="ml-4 text-red-300 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* STATS */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-500">
              Produits
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalProducts}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              produits suivis
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-500">
              Quantité totale
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalQuantity}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              unités en stock
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-500">
              Stock faible
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-400">
              {lowStockCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              produits à surveiller
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-500">
              Ruptures
            </p>

            <p className="mt-2 text-3xl font-bold text-red-400">
              {outOfStockCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              produits épuisés
            </p>
          </div>
        </div>

        {/* SEARCH / FILTER */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row">

          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              ⌕
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher un produit, SKU ou code-barres..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-600"
            />
          </div>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value as
                  | "ALL"
                  | "IN_STOCK"
                  | "LOW"
                  | "OUT",
              )
            }
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300 outline-none focus:border-slate-600"
          >
            <option value="ALL">
              Tous les produits
            </option>

            <option value="IN_STOCK">
              En stock
            </option>

            <option value="LOW">
              Stock faible
            </option>

            <option value="OUT">
              Rupture
            </option>
          </select>
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="font-semibold">
              Produits
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredProducts.length} produit
              {filteredProducts.length !== 1
                ? "s"
                : ""}{" "}
              affiché
              {filteredProducts.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-60 items-center justify-center text-slate-500">
              Chargement du stock...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 text-4xl">
                📦
              </div>

              <h3 className="font-semibold">
                Aucun produit trouvé
              </h3>

              <p className="mt-2 max-w-md text-sm text-slate-500">
                Aucun produit ne correspond à
                votre recherche ou à votre filtre.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">

                <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">
                      Produit
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Référence
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Prix
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Quantité
                    </th>

                    <th className="px-6 py-4 font-medium">
                      État
                    </th>

                    <th className="px-6 py-4 text-right font-medium">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">

                  {filteredProducts.map(
                    (product) => {
                      const status =
                        getStockStatus(
                          product.inventory
                            .quantity,
                        );

                      return (
                        <tr
                          key={product.id}
                          className="transition hover:bg-slate-800/40"
                        >
                          <td className="px-6 py-5">
                            <button
                              onClick={() =>
                                selectProduct(
                                  product,
                                )
                              }
                              className="text-left"
                            >
                              <p className="font-medium text-white hover:underline">
                                {product.name}
                              </p>

                              {product.barcode && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {product.barcode}
                                </p>
                              )}
                            </button>
                          </td>

                          <td className="px-6 py-5 text-slate-400">
                            {product.sku ||
                              "—"}
                          </td>

                          <td className="px-6 py-5 text-slate-300">
                            {Number(
                              product.price,
                            ).toFixed(2)}{" "}
                            $
                          </td>

                          <td className="px-6 py-5">
                            <span className="font-semibold">
                              {
                                product
                                  .inventory
                                  .quantity
                              }
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>

                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={() =>
                                selectProduct(
                                  product,
                                )
                              }
                              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            >
                              Gérer
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )}

                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PRODUCT PANEL */}
      {selectedProduct &&
        !action && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

              <div className="flex items-start justify-between border-b border-slate-800 p-6">
                <div>
                  <p className="text-sm text-slate-500">
                    Gestion du produit
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {selectedProduct.name}
                  </h2>
                </div>

                <button
                  onClick={closeProduct}
                  className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-800 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="p-6">

                <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <p className="text-sm text-slate-500">
                    Stock actuel
                  </p>

                  <p className="mt-1 text-4xl font-bold">
                    {
                      selectedProduct
                        .inventory.quantity
                    }
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    unités disponibles
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">

                  <button
                    onClick={() =>
                      openAction(
                        selectedProduct,
                        "add",
                      )
                    }
                    className="rounded-xl bg-white px-4 py-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                  >
                    <span className="block text-xl">
                      +
                    </span>

                    Ajouter du stock
                  </button>

                  <button
                    onClick={() =>
                      openAction(
                        selectedProduct,
                        "remove",
                      )
                    }
                    className="rounded-xl border border-slate-700 px-4 py-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                  >
                    <span className="block text-xl">
                      −
                    </span>

                    Retirer du stock
                  </button>

                  <button
                    onClick={() =>
                      openAction(
                        selectedProduct,
                        "adjust",
                      )
                    }
                    className="rounded-xl border border-slate-700 px-4 py-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                  >
                    <span className="block text-xl">
                      ⚙
                    </span>

                    Corriger le stock
                  </button>

                </div>

                <div className="mt-8">
                  <h3 className="font-semibold">
                    Historique
                  </h3>

                  {movementsLoading ? (
                    <p className="mt-4 text-sm text-slate-500">
                      Chargement...
                    </p>
                  ) : movements.length ===
                    0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      Aucun mouvement pour ce
                      produit.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {movements.map(
                        (movement) => (
                          <div
                            key={
                              movement.id
                            }
                            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {getMovementLabel(
                                  movement.type,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {movement.reason ||
                                  "Aucune raison"}{" "}
                                ·{" "}
                                {formatDate(
                                  movement.createdAt,
                                )}
                              </p>
                            </div>

                            <span
                              className={`font-semibold ${
                                movement.quantity >
                                0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {movement.quantity >
                              0
                                ? "+"
                                : ""}
                              {
                                movement.quantity
                              }
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

      {/* ACTION MODAL */}
      {selectedProduct && action && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">

            <div className="mb-6">
              <h2 className="text-xl font-bold">
                {action === "add"
                  ? "Ajouter du stock"
                  : action === "remove"
                    ? "Retirer du stock"
                    : "Corriger le stock"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedProduct.name}
              </p>
            </div>

            <div className="mb-5 rounded-xl bg-slate-950 p-4">
              <p className="text-xs text-slate-500">
                Stock actuel
              </p>

              <p className="mt-1 text-2xl font-bold">
                {
                  selectedProduct.inventory
                    .quantity
                }
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                {action === "adjust"
                  ? "Nouvelle quantité"
                  : "Quantité"}
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    event.target.value,
                  )
                }
                placeholder="Ex. 10"
                autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Raison{" "}
                <span className="text-slate-600">
                  (facultatif)
                </span>
              </label>

              <input
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value,
                  )
                }
                placeholder={
                  action === "add"
                    ? "Ex. Réapprovisionnement"
                    : action === "remove"
                      ? "Ex. Produit vendu"
                      : "Ex. Correction d'inventaire"
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white"
              />
            </div>

            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={() => {
                  setAction(null);
                  setQuantity("");
                  setReason("");
                }}
                disabled={actionLoading}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Retour
              </button>

              <button
                type="button"
                onClick={handleStockAction}
                disabled={
                  actionLoading ||
                  !quantity
                }
                className="flex-1 rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Enregistrement..."
                  : "Confirmer"}
              </button>

            </div>

          </div>
        </div>
      )}
    </main>
  );
}