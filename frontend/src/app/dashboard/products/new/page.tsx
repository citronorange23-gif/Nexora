"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import BackButton from "@/components/ui/BackButton";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

type ProductType = "PRODUCT" | "SERVICE";

type LookupProduct = {
  barcode: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  image: string | null;
};

export default function NewProductPage() {
  const router = useRouter();

  const [mode, setMode] = useState<
    "MANUAL" | "SCAN"
  >("MANUAL");

  const [barcode, setBarcode] = useState("");

  const [loadingLookup, setLoadingLookup] =
    useState(false);

  const [lookupMessage, setLookupMessage] =
    useState("");

  const [saving, setSaving] = useState(false);

  const [cameraActive, setCameraActive] =
    useState(false);

  const [cameraError, setCameraError] =
    useState("");

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const readerRef =
    useRef<BrowserMultiFormatReader | null>(
      null,
    );

  const controlsRef =
    useRef<any>(null);

  const [form, setForm] = useState({
    name: "",
    barcode: "",
    sku: "",
    description: "",
    type: "PRODUCT" as ProductType,
    price: "",
    costPrice: "",
    quantity: "0",
    minStock: "0",
    maxStock: "",
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

  /*
   * =====================================================
   * CAMERA
   * =====================================================
   */

  async function startScanner() {
    setCameraError("");
    setLookupMessage("");

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      if (!videoRef.current) {
        return; // Évite de planter si le DOM n'est pas prêt
      }

      controlsRef.current = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        videoRef.current,
        async (result, error) => {
          if (!result) return;

          const detectedBarcode = result.getText().trim();
          if (!detectedBarcode) return;

          stopScanner();
          setBarcode(detectedBarcode);
          updateField("barcode", detectedBarcode);
          await lookupBarcode(detectedBarcode);
        }
      );
    } catch (error) {
      console.error("Erreur caméra:", error);
      setCameraActive(false);
      setCameraError(
        "Impossible d'accéder à la caméra. Vérifie que ton navigateur a l'autorisation d'utiliser la caméra."
      );
    }
  }

  // 3. Ajoute ce useEffect pour lancer le scanner dès que le conteneur vidéo est monté
  useEffect(() => {
    if (cameraActive && videoRef.current) {
      startScanner();
    }
  }, [cameraActive]);

  function stopScanner() {
    try {
      controlsRef.current?.stop();
    } catch {
      // Rien à faire
    }

    controlsRef.current = null;

    readerRef.current = null;

    if (videoRef.current) {
      const stream =
        videoRef.current.srcObject as
          | MediaStream
          | null;

      stream?.getTracks().forEach(
        (track) => track.stop(),
      );

      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  /*
   * =====================================================
   * LOOKUP
   * =====================================================
   */

  async function lookupBarcode(
    barcodeToLookup?: string,
  ) {
    const cleanBarcode = (
      barcodeToLookup ?? barcode
    ).trim();

    if (!cleanBarcode) {
      setLookupMessage(
        "Entre ou scanne un code-barres.",
      );
      return;
    }

    setLoadingLookup(true);
    setLookupMessage("");

    try {
      const token =
        localStorage.getItem("nexora_token");

      const response = await fetch(
        `${API_URL}/api/products/lookup?barcode=${encodeURIComponent(
          cleanBarcode,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data =
        await response.json();

      if (response.status === 404) {
        setLookupMessage(
          "Produit introuvable. Tu peux continuer manuellement.",
        );

        updateField(
          "barcode",
          cleanBarcode,
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ??
            "Erreur lors de la recherche.",
        );
      }

      const product: LookupProduct =
        data.product;

      setForm((current) => ({
        ...current,

        name:
          product.name ||
          current.name,

        barcode:
          product.barcode ||
          cleanBarcode,

        description:
          product.description ||
          current.description,
      }));

      setLookupMessage(
        "✓ Produit trouvé ! Vérifie les informations avant de créer.",
      );
    } catch (error) {
      console.error(error);

      setLookupMessage(
        "Impossible de récupérer le produit.",
      );
    } finally {
      setLoadingLookup(false);
    }
  }

  /*
   * =====================================================
   * SUBMIT
   * =====================================================
   */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);

    try {
      const token =
        localStorage.getItem("nexora_token");

      const response = await fetch(
        `${API_URL}/api/products`,
        {
          method: "POST",

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

            initialStock:
              form.type === "PRODUCT"
                ? Number(form.quantity)
                : undefined,

            minStock:
              form.type === "PRODUCT"
                ? Number(form.minStock)
                : undefined,

            maxStock:
              form.type === "PRODUCT" &&
              form.maxStock
                ? Number(form.maxStock)
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
            "Impossible de créer le produit.",
        );
      }

      router.push(
        "/dashboard/products",
      );
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la création.",
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-4xl">

        <BackButton href="/dashboard/products">
          Retour aux produits
        </BackButton>

        <div className="mb-8 mt-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Ajouter un produit
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Ajoute manuellement un produit ou
            scanne son code-barres pour récupérer
            automatiquement ses informations.
          </p>
        </div>

        {/* MODE */}

        <div className="mb-8 grid grid-cols-2 gap-3">

          <button
            type="button"
            onClick={() => {
              stopScanner();
              setMode("MANUAL");
            }}
            className={`rounded-xl border p-4 text-left transition ${
              mode === "MANUAL"
                ? "border-white bg-white font-medium text-slate-950"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="font-medium">
              ✍️ Manuel
            </div>

            <div className="mt-1 text-sm opacity-80">
              Remplir les informations
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setMode("SCAN")
            }
            className={`rounded-xl border p-4 text-left transition ${
              mode === "SCAN"
                ? "border-white bg-white font-medium text-slate-950"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <div className="font-medium">
              📷 Scanner
            </div>

            <div className="mt-1 text-sm opacity-80">
              Scanner avec la caméra
            </div>
          </button>

        </div>

        {/* SCANNER */}

        {mode === "SCAN" && (
          <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-white">
                  Scanner un produit
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Place le code-barres devant la
                  caméra.
                </p>
              </div>

              {!cameraActive && (
                <button
                  type="button"
                  onClick={() => setCameraActive(true)}
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  📷 Ouvrir la caméra
                </button>
              )}
            </div>

            {/* CAMERA */}

            {cameraActive && (
              <div className="mt-5">

                <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-black">

                  <video
                    ref={videoRef}
                    className="h-auto min-h-[280px] w-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />

                  {/* Cadre de scan */}

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

                    <div className="relative h-32 w-[80%] max-w-md rounded-xl border-2 border-white">

                      <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-white/70" />

                    </div>

                  </div>

                </div>

                <div className="mt-4 flex items-center justify-between">

                  <p className="text-sm text-slate-400">
                    Recherche du code-barres...
                  </p>

                  <button
                    type="button"
                    onClick={stopScanner}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    Fermer
                  </button>

                </div>

              </div>
            )}

            {/* CAMERA ERROR */}

            {cameraError && (
              <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                {cameraError}
              </div>
            )}

            {/* MANUAL BARCODE FALLBACK */}

            <div className="mt-6 border-t border-slate-800 pt-5">

              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Ou entrer le code manuellement
              </p>

              <div className="flex gap-3">

                <input
                  value={barcode}
                  onChange={(event) =>
                    setBarcode(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter"
                    ) {
                      event.preventDefault();

                      lookupBarcode();
                    }
                  }}
                  placeholder="EAN / UPC / GTIN"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 transition focus:border-white"
                />

                <button
                  type="button"
                  onClick={() =>
                    lookupBarcode()
                  }
                  disabled={loadingLookup}
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  {loadingLookup
                    ? "Recherche..."
                    : "Rechercher"}
                </button>

              </div>

            </div>

            {lookupMessage && (
              <p className="mt-4 text-sm text-slate-400">
                {lookupMessage}
              </p>
            )}

          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* INFORMATIONS */}

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

          {/* PRIX */}

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

          {/* STOCK */}

          {form.type === "PRODUCT" && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

              <h2 className="mb-5 text-lg font-medium text-white">
                Stock
              </h2>

              <div className="grid gap-5 md:grid-cols-3">

                <Field
                  label="Stock initial"
                  type="number"
                  value={form.quantity}
                  onChange={(value) =>
                    updateField(
                      "quantity",
                      value,
                    )
                  }
                />

                <Field
                  label="Stock minimum"
                  type="number"
                  value={form.minStock}
                  onChange={(value) =>
                    updateField(
                      "minStock",
                      value,
                    )
                  }
                />

                <Field
                  label="Stock maximum"
                  type="number"
                  value={form.maxStock}
                  onChange={(value) =>
                    updateField(
                      "maxStock",
                      value,
                    )
                  }
                />

              </div>

            </section>
          )}

          {/* ACTIVE */}

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

          {/* ACTIONS */}

          <div className="flex justify-end gap-3">

            <button
              type="button"
              onClick={() => {
                stopScanner();

                router.push(
                  "/dashboard/products",
                );
              }}
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
                ? "Création..."
                : "Créer le produit"}
            </button>

          </div>

        </form>
      </div>
    </main>
  );
}

/*
 * =====================================================
 * FIELD
 * =====================================================
 */

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