"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import BackButton from "@/components/ui/BackButton";

interface Inventory {
  quantity: number;
  minStock: number;
  maxStock: number | null;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  type: "PRODUCT" | "SERVICE";
  price: number;
  costPrice: number | null;
  active: boolean;
  inventory: Inventory | null;
  createdAt: string;
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
  error?: string;
}

interface DeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "ALL" | "PRODUCT" | "SERVICE"
  >("ALL");

  const [error, setError] = useState("");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response =
        await apiFetch<ProductsResponse>(
          "/api/products",
        );

      setProducts(response.data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les produits.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
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

      const matchesType =
        filter === "ALL" ||
        product.type === filter;

      return matchesSearch && matchesType;
    });
  }, [products, search, filter]);

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer "${product.name}" ?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(product.id);
      setError("");

      await apiFetch<DeleteResponse>(
        `/api/products/${product.id}`,
        {
          method: "DELETE",
        },
      );

      setProducts((current) =>
        current.filter(
          (item) => item.id !== product.id,
        ),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le produit.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function getStockStatus(product: Product) {
    if (product.type === "SERVICE") {
      return {
        label: "Service",
        className:
          "bg-slate-800 text-slate-300",
      };
    }

    const quantity =
      product.inventory?.quantity ?? 0;

    const minStock =
      product.inventory?.minStock ?? 0;

    if (quantity === 0) {
      return {
        label: "Rupture",
        className:
          "bg-red-950/60 text-red-400",
      };
    }

    if (
      minStock > 0 &&
      quantity <= minStock
    ) {
      return {
        label: "Stock faible",
        className:
          "bg-amber-950/60 text-amber-400",
      };
    }

    return {
      label: `${quantity} en stock`,
      className:
        "bg-emerald-950/60 text-emerald-400",
    };
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl">

        {/* RETOUR */}
        <BackButton href="/dashboard">
          Retour au tableau de bord
        </BackButton>

        {/* HEADER */}
        <div className="mb-8 mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-500">
              Catalogue
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Produits
            </h1>

            <p className="mt-2 text-slate-400">
              Gérez vos produits et services depuis
              un seul endroit.
            </p>
          </div>

          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            + Nouveau produit
          </Link>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            <span>{error}</span>

            <button
              type="button"
              onClick={loadProducts}
              className="font-semibold text-red-300 hover:text-white"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* FILTERS */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <label
                htmlFor="search"
                className="sr-only"
              >
                Rechercher
              </label>

              <input
                id="search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Rechercher un produit, une référence ou un code-barres..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 transition focus:border-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  filter === "ALL"
                    ? "bg-white text-slate-950"
                    : "border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                Tout
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter("PRODUCT")
                }
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  filter === "PRODUCT"
                    ? "bg-white text-slate-950"
                    : "border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                Produits
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter("SERVICE")
                }
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  filter === "SERVICE"
                    ? "bg-white text-slate-950"
                    : "border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                Services
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              Chargement de vos produits...
            </div>
          ) : products.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
                📦
              </div>

              <h2 className="mt-5 text-lg font-semibold text-white">
                Aucun produit pour le moment
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                Commencez par créer votre premier
                produit ou service pour construire
                votre catalogue.
              </p>

              <Link
                href="/dashboard/products/new"
                className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Créer mon premier produit
              </Link>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <p className="font-medium text-white">
                Aucun résultat
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Essayez avec un autre nom ou
                une autre référence.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-4">
                        Produit
                      </th>

                      <th className="px-6 py-4">
                        Type
                      </th>

                      <th className="px-6 py-4">
                        Prix
                      </th>

                      <th className="px-6 py-4">
                        Stock
                      </th>

                      <th className="px-6 py-4 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map(
                      (product) => {
                        const stockStatus =
                          getStockStatus(product);

                        return (
                          <tr
                            key={product.id}
                            className="border-b border-slate-800 last:border-0 hover:bg-slate-950/50"
                          >
                            <td className="px-6 py-5">
                              <div>
                                <p className="font-semibold text-white">
                                  {product.name}
                                </p>

                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                  {product.sku && (
                                    <span>
                                      Réf.{" "}
                                      {product.sku}
                                    </span>
                                  )}

                                  {product.barcode && (
                                    <span>
                                      Code{" "}
                                      {product.barcode}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5">
                              <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300">
                                {product.type ===
                                "PRODUCT"
                                  ? "Produit"
                                  : "Service"}
                              </span>
                            </td>

                            <td className="px-6 py-5 font-medium text-slate-200">
                              {Number(product.price).toFixed(2)} $
                            </td>

                            <td className="px-6 py-5">
                              <span
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${stockStatus.className}`}
                              >
                                {stockStatus.label}
                              </span>
                            </td>

                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/dashboard/products/edit/${product.id}`}
                                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                >
                                  Modifier
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      product,
                                    )
                                  }
                                  disabled={
                                    deletingId ===
                                    product.id
                                  }
                                  className="rounded-lg border border-red-900/70 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deletingId ===
                                  product.id
                                    ? "Suppression..."
                                    : "Supprimer"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}
              <div className="divide-y divide-slate-800 md:hidden">
                {filteredProducts.map(
                  (product) => {
                    const stockStatus =
                      getStockStatus(product);

                    return (
                      <div
                        key={product.id}
                        className="p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h2 className="truncate font-semibold text-white">
                              {product.name}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                              {product.type ===
                              "PRODUCT"
                                ? "Produit"
                                : "Service"}
                            </p>
                          </div>

                          <p className="shrink-0 font-semibold text-white">
                            {Number(product.price).toFixed(2)} $
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {product.sku && (
                            <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
                              Réf. {product.sku}
                            </span>
                          )}

                          <span
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${stockStatus.className}`}
                          >
                            {stockStatus.label}
                          </span>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Link
                            href={`/dashboard/products/edit/${product.id}`}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                          >
                            Modifier
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                product,
                              )
                            }
                            disabled={
                              deletingId ===
                              product.id
                            }
                            className="rounded-lg border border-red-900/70 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-950/50 disabled:opacity-50"
                          >
                            {deletingId ===
                            product.id
                              ? "..."
                              : "Supprimer"}
                          </button>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        {!loading &&
          products.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>
                {filteredProducts.length}{" "}
                résultat
                {filteredProducts.length !== 1
                  ? "s"
                  : ""}
              </span>

              <button
                type="button"
                onClick={loadProducts}
                className="font-medium text-slate-400 transition hover:text-white"
              >
                ↻ Actualiser
              </button>
            </div>
          )}
      </div>
    </main>
  );
}