"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { apiFetch } from "@/lib/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

type ProductType = "PRODUCT" | "SERVICE";

type ProductResponse = {
  success: boolean;
  data?: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    description: string | null;
    type: ProductType;
    price: number;
    costPrice: number | null;
    active: boolean;
  };
  error?: string;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    barcode: "",
    sku: "",
    description: "",
    type: "PRODUCT" as ProductType,
    price: "",
    costPrice: "",
    active: true,
  });

  function updateField(
    field: keyof typeof form,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");

      const response =
        await apiFetch<ProductResponse>(
          `/api/products/${productId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem(
                "nexora_token",
              )}`,
            },
          },
        );

      if (!response.data) {
        throw new Error(
          response.error ??
            "Produit introuvable.",
        );
      }

      const product = response.data;

      setForm({
        name: product.name,
        barcode: product.barcode ?? "",
        sku: product.sku ?? "",
        description:
          product.description ?? "",
        type: product.type,
        price: String(product.price),
        costPrice:
          product.costPrice !== null
            ? String(product.costPrice)
            : "",
        active: product.active,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de charger le produit.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const token =
        localStorage.getItem("nexora_token");

      const response = await fetch(
        `${API_URL}/api/products/${productId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            name: form.name,

            barcode:
              form.barcode || undefined,

            sku:
              form.sku || undefined,

            description:
              form.description ||
              undefined,

            type: form.type,

            price: Number(form.price),

            costPrice:
              form.costPrice
                ? Number(form.costPrice)
                : undefined,

            active: form.active,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ??
            data.error ??
            "Impossible de mettre à jour le produit.",
        );
      }

      router.push(
        "/dashboard/products",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise à jour.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-500">
        Chargement du produit...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-4xl">

        <BackButton href="/dashboard/products">
          Retour aux produits
        </BackButton>

        <div className="mb-8 mt-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Modifier le produit
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Mets à jour les informations de ce
            produit.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="mb-5 text-lg font-medium text-white">
              Informations générales
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <Field
                label="Nom"
                required
                value={form.name}
                onChange={(value) =>
                  updateField(
                    "name",
                    value,
                  )
                }
              />

              <Field
                label="SKU"
                value={form.sku}
                onChange={(value) =>
                  updateField(
                    "sku",
                    value,
                  )
                }
              />

              <Field
                label="Code-barres"
                value={form.barcode}
                onChange={(value) =>
                  updateField(
                    "barcode",
                    value,
                  )
                }
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Type
                </label>

                <select
                  value={form.type}
                  onChange={(event) =>
                    updateField(
                      "type",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-white"
                >
                  <option value="PRODUCT">
                    Produit
                  </option>

                  <option value="SERVICE">
                    Service
                  </option>
                </select>
              </div>

            </div>

            <div className="mt-5">

              <label className="mb-2 block text-sm font-medium text-slate-300">
                Description
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value,
                  )
                }
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 transition focus:border-white"
                placeholder="Description du produit..."
              />

            </div>

          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h2 className="mb-5 text-lg font-medium text-white">
              Prix
            </h2>

            <div className="grid gap-5 md:grid-cols-2">

              <Field
                label="Prix de vente"
                required
                type="number"
                step="0.01"
                value={form.price}
                onChange={(value) =>
                  updateField(
                    "price",
                    value,
                  )
                }
              />

              <Field
                label="Prix coûtant"
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(value) =>
                  updateField(
                    "costPrice",
                    value,
                  )
                }
              />

            </div>

          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <label className="flex cursor-pointer items-center gap-3">

              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  updateField(
                    "active",
                    event.target.checked,
                  )
                }
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-white accent-white"
              />

              <span className="text-sm font-medium text-white">
                Produit actif
              </span>

            </label>

          </section>

          <div className="flex justify-end gap-3">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/products",
                )
              }
              className="rounded-xl border border-slate-700 px-5 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                !form.name ||
                !form.price
              }
              className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {saving
                ? "Enregistrement..."
                : "Enregistrer"}
            </button>

          </div>

        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}

        {required && (
          <span className="ml-1 text-red-400">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        step={step}
        required={required}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 transition focus:border-white"
      />

    </div>
  );
}