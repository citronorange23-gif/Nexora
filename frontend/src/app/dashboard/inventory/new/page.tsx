"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";

import { apiFetch } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  active: boolean;
  inventory: {
    quantity: number;
  } | null;
}

interface InventoryResponse {
  success: boolean;
  data: Product[];
  error?: string;
}

interface AddStockResponse {
  success: boolean;
  data?: {
    quantity: number;
  };
  error?: string;
}

export default function NewStockPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response =
        await apiFetch<InventoryResponse>(
          "/api/inventory",
        );

      setProducts(
        response.data.filter(
          (product) => product.active,
        ),
      );
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

  const selectedProduct = products.find(
    (product) => product.id === productId,
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!productId) {
      setError("Sélectionnez un produit.");
      return;
    }

    const amount = Number(quantity);

    if (!Number.isInteger(amount) || amount <= 0) {
      setError(
        "La quantité doit être un nombre entier supérieur à 0.",
      );
      return;
    }

    try {
      setSaving(true);

      await apiFetch<AddStockResponse>(
        `/api/inventory/${productId}/add`,
        {
          method: "POST",
          body: JSON.stringify({
            quantity: amount,
            reason:
              reason.trim() || undefined,
          }),
        },
      );

      router.push("/dashboard/inventory");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter le stock.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-2xl">

        {/* HEADER */}
        <div className="mb-8">
          <BackButton href="/dashboard/inventory">
            Retour au stock
          </BackButton>

          <p className="mb-1 text-sm font-medium text-slate-500">
            Gestion du stock
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Ajouter du stock
          </h1>

          <p className="mt-2 text-slate-400">
            Ajoutez des unités à un produit existant.
          </p>
        </div>

        {/* CARD */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">

          {error && (
            <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              Chargement des produits...
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center">
              <p className="font-medium text-white">
                Aucun produit disponible
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Vous devez d'abord créer un produit
                avant de pouvoir ajouter du stock.
              </p>

              <Link
                href="/dashboard/products/new"
                className="mt-5 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Créer un produit
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              {/* PRODUIT */}
              <div>
                <label
                  htmlFor="product"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Produit
                </label>

                <select
                  id="product"
                  value={productId}
                  onChange={(event) =>
                    setProductId(event.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-white"
                >
                  <option value="">
                    Sélectionner un produit
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* INFO PRODUIT */}
              {selectedProduct && (
                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Stock actuel
                    </p>

                    <p className="mt-2 text-2xl font-bold text-white">
                      {selectedProduct.inventory?.quantity ?? 0}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      unités disponibles
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Produit sélectionné
                    </p>

                    <p className="mt-2 font-semibold text-white">
                      {selectedProduct.name}
                    </p>

                    {selectedProduct.sku && (
                      <p className="mt-1 text-sm text-slate-500">
                        Référence : {selectedProduct.sku}
                      </p>
                    )}
                  </div>

                </div>
              )}

              {/* QUANTITÉ */}
              <div>
                <label
                  htmlFor="quantity"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Quantité à ajouter
                </label>

                <input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                  placeholder="Ex. 25"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 transition focus:border-white"
                />

                {selectedProduct &&
                  quantity &&
                  Number(quantity) > 0 && (
                    <p className="mt-2 text-sm text-slate-500">
                      Nouveau stock :{" "}
                      <span className="font-semibold text-slate-300">
                        {(selectedProduct.inventory?.quantity ?? 0) +
                          Number(quantity)}
                      </span>{" "}
                      unités
                    </p>
                  )}
              </div>

              {/* RAISON */}
              <div>
                <label
                  htmlFor="reason"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Pourquoi ajoutez-vous ce stock ?
                  <span className="ml-1 font-normal text-slate-500">
                    (optionnel)
                  </span>
                </label>

                <input
                  id="reason"
                  type="text"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="Ex. Nouvelle livraison"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 transition focus:border-white"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">

                <Link
                  href="/dashboard/inventory"
                  className="flex-1 rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Annuler
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Ajout en cours..."
                    : "Ajouter au stock"}
                </button>

              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}