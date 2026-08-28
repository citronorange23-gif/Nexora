
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { apiFetch } from "@/lib/api";

type Product = {
  id: string;
  name: string;
  barcode?: string | null;
  price: number | string;
  active?: boolean;
  inventory?: {
    quantity: number;
  } | null;
};

type Customer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type ProductsResponse = {
  success: boolean;
  data: Product[];
};

type CustomersResponse = {
  success: boolean;
  data: Customer[];
};

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const readerRef =
    useRef<BrowserMultiFormatReader | null>(null);

  const controlsRef = useRef<any>(null);

  /*
   * =====================================================
   * LOAD DATA
   * =====================================================
   */

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          productsResponse,
          customersResponse,
        ] = await Promise.all([
          apiFetch<ProductsResponse>(
            "/api/products?all=false",
          ),

          apiFetch<CustomersResponse>(
            "/api/customers",
          ),
        ]);

        setProducts(
          productsResponse.data ?? [],
        );

        setCustomers(
          customersResponse.data ?? [],
        );
      } catch (err) {
        console.error(err);

        setError(
          "Impossible de charger les produits ou les clients.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /*
   * =====================================================
   * PRODUCT SEARCH
   * =====================================================
   */

  const filteredProducts = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return products;
    }

    return products.filter((product) => {
      const name =
        product.name.toLowerCase();

      const productBarcode =
        product.barcode
          ?.toLowerCase() ?? "";

      return (
        name.includes(value) ||
        productBarcode.includes(value)
      );
    });
  }, [products, search]);

  /*
   * =====================================================
   * CART
   * =====================================================
   */

  function addToCart(product: Product) {
    setError("");
    setSuccess("");

    const stock =
      product.inventory?.quantity ?? 0;

    if (stock <= 0) {
      setError(
        `${product.name} est en rupture de stock.`,
      );

      return;
    }

    setCart((currentCart) => {
      const existing =
        currentCart.find(
          (item) =>
            item.product.id === product.id,
        );

      if (!existing) {
        return [
          ...currentCart,
          {
            product,
            quantity: 1,
          },
        ];
      }

      if (existing.quantity >= stock) {
        return currentCart;
      }

      return currentCart.map((item) =>
        item.product.id === product.id
          ? {
              ...item,
              quantity:
                item.quantity + 1,
            }
          : item,
      );
    });
  }

  function updateQuantity(
    productId: string,
    quantity: number,
  ) {
    const item = cart.find(
      (cartItem) =>
        cartItem.product.id === productId,
    );

    if (!item) {
      return;
    }

    const stock =
      item.product.inventory?.quantity ?? 0;

    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (quantity > stock) {
      setError(
        `Stock insuffisant pour ${item.product.name}. Stock disponible : ${stock}.`,
      );

      return;
    }

    setCart((currentCart) =>
      currentCart.map((cartItem) =>
        cartItem.product.id === productId
          ? {
              ...cartItem,
              quantity,
            }
          : cartItem,
      ),
    );
  }

  function removeFromCart(
    productId: string,
  ) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          item.product.id !== productId,
      ),
    );
  }

  /*
   * =====================================================
   * BARCODE
   * =====================================================
   */

  function findProductByBarcode(
    barcodeToFind: string,
  ) {
    const cleanBarcode =
      barcodeToFind
        .replace(/\s/g, "")
        .toLowerCase();

    return products.find(
      (product) =>
        product.barcode
          ?.replace(/\s/g, "")
          .toLowerCase() === cleanBarcode,
    );
  }

  function handleBarcode(
    barcodeToAdd: string,
  ) {
    const cleanBarcode =
      barcodeToAdd
        .replace(/\s/g, "")
        .trim();

    if (!cleanBarcode) {
      return;
    }

    const product =
      findProductByBarcode(cleanBarcode);

    if (!product) {
      setError(
        `Aucun produit actif avec le code-barres ${cleanBarcode}.`,
      );

      return;
    }

    addToCart(product);

    setBarcode("");
    setSearch("");
    setError("");
  }

  function handleBarcodeKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    handleBarcode(barcode);
  }

  /*
   * =====================================================
   * CAMERA
   * =====================================================
   */

  async function startScanner() {
    setCameraError("");
    setError("");

    try {
      const reader =
        new BrowserMultiFormatReader();

      readerRef.current = reader;

      if (!videoRef.current) {
        return;
      }

      controlsRef.current =
        await reader.decodeFromConstraints(
          {
            video: {
              facingMode: {
                ideal: "environment",
              },

              width: {
                ideal: 1280,
              },

              height: {
                ideal: 720,
              },
            },

            audio: false,
          },

          videoRef.current,

          async (result) => {
            if (!result) {
              return;
            }

            const detectedBarcode =
              result
                .getText()
                .trim();

            if (!detectedBarcode) {
              return;
            }

            stopScanner();

            handleBarcode(
              detectedBarcode,
            );
          },
        );
    } catch (error) {
      console.error(
        "Erreur caméra:",
        error,
      );

      setCameraActive(false);

      setCameraError(
        "Impossible d'accéder à la caméra. Vérifie que ton navigateur a l'autorisation d'utiliser la caméra.",
      );
    }
  }

  useEffect(() => {
    if (
      cameraActive &&
      videoRef.current
    ) {
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
        videoRef.current
          .srcObject as
          | MediaStream
          | null;

      stream?.getTracks().forEach(
        (track) =>
          track.stop(),
      );

      videoRef.current.srcObject =
        null;
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
   * TOTALS
   * =====================================================
   */

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.product.price) *
          item.quantity,
      0,
    );
  }, [cart]);

  const taxRate = 15;

  const tax =
    subtotal * (taxRate / 100);

  const total =
    subtotal + tax;

  const itemCount = cart.reduce(
    (count, item) =>
      count + item.quantity,
    0,
  );

  /*
   * =====================================================
   * CUSTOMER
   * =====================================================
   */

  function getCustomerName(
    customer: Customer,
  ) {
    const name =
      `${customer.firstName ?? ""} ${
        customer.lastName ?? ""
      }`.trim();

    return (
      name ||
      customer.email ||
      customer.phone ||
      "Client"
    );
  }

  /*
   * =====================================================
   * CHECKOUT
   * =====================================================
   */

  async function checkout() {
    if (cart.length === 0) {
      setError(
        "Le panier est vide.",
      );

      return;
    }

    try {
      setCheckoutLoading(true);
      setError("");
      setSuccess("");

      await apiFetch(
        "/api/sales",
        {
          method: "POST",

          body: JSON.stringify({
            customerId:
              selectedCustomer?.id,

            items: cart.map(
              (item) => ({
                productId:
                  item.product.id,

                quantity:
                  item.quantity,
              }),
            ),

            taxRate,

            payment: {
              method: "CASH",
            },
          }),
        },
      );

      setCart([]);
      setSelectedCustomer(null);
      setSearch("");
      setBarcode("");

      setSuccess(
        "Vente enregistrée avec succès.",
      );
    } catch (err) {
      console.error(err);

      setError(
        "Impossible d'enregistrer la vente.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">
            Chargement de la caisse...
          </p>
        </div>
      </main>
    );
  }

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Caisse
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Recherche ou scanne un produit
            pour l'ajouter au panier.
          </p>
        </div>

        {/* MESSAGES */}

        {error && (
          <div className="mb-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-green-900 bg-green-950/40 px-4 py-3 text-sm text-green-400">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">

          {/* ========================================= */}
          {/* PRODUITS */}
          {/* ========================================= */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            {/* RECHERCHE */}

            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Rechercher un produit..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 transition focus:border-white"
              />
            </div>

            {/* SCANNER */}

            <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950 p-4">

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                <div>
                  <p className="font-medium">
                    Scanner un code-barres
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Utilise la caméra ou entre
                    le code manuellement.
                  </p>
                </div>

                {!cameraActive && (
                  <button
                    type="button"
                    onClick={() =>
                      setCameraActive(
                        true,
                      )
                    }
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                  >
                    📷 Scanner
                  </button>
                )}

              </div>

              {/* CAMERA */}

              {cameraActive && (
                <div className="mt-4">

                  <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black">

                    <video
                      ref={videoRef}
                      className="min-h-[260px] w-full object-cover"
                      autoPlay
                      muted
                      playsInline
                    />

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

                      <div className="relative h-28 w-[80%] max-w-md rounded-xl border-2 border-white">

                        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-white/70" />

                      </div>

                    </div>

                  </div>

                  <div className="mt-3 flex items-center justify-between">

                    <p className="text-xs text-slate-500">
                      Recherche du code-barres...
                    </p>

                    <button
                      type="button"
                      onClick={
                        stopScanner
                      }
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
                    >
                      Fermer
                    </button>

                  </div>

                </div>
              )}

              {/* CAMERA ERROR */}

              {cameraError && (
                <div className="mt-3 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                  {cameraError}
                </div>
              )}

              {/* MANUAL BARCODE */}

              <div className="mt-4 flex gap-2">

                <input
                  type="text"
                  value={barcode}
                  onChange={(event) =>
                    setBarcode(
                      event.target.value,
                    )
                  }
                  onKeyDown={
                    handleBarcodeKeyDown
                  }
                  placeholder="EAN / UPC / GTIN"
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white"
                />

                <button
                  type="button"
                  onClick={() =>
                    handleBarcode(
                      barcode,
                    )
                  }
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Ajouter
                </button>

              </div>

            </div>

            {/* GRID */}

            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center">

                <p className="text-slate-400">
                  Aucun produit trouvé.
                </p>

                {search && (
                  <p className="mt-1 text-xs text-slate-600">
                    Essaie une autre recherche.
                  </p>
                )}

              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">

                {filteredProducts.map(
                  (product) => {
                    const stock =
                      product.inventory
                        ?.quantity ?? 0;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() =>
                          addToCart(
                            product,
                          )
                        }
                        disabled={
                          stock <= 0
                        }
                        className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-left transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >

                        <div className="mb-3 flex min-h-20 items-center justify-center rounded-lg bg-slate-900 px-2 text-center text-sm font-medium">
                          {
                            product.name
                          }
                        </div>

                        <p className="text-lg font-bold">
                          {Number(
                            product.price,
                          ).toFixed(2)}{" "}
                          $
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Stock :{" "}
                          {stock}
                        </p>

                        {product.barcode && (
                          <p className="mt-1 truncate text-xs text-slate-600">
                            {
                              product.barcode
                            }
                          </p>
                        )}

                      </button>
                    );
                  },
                )}

              </div>
            )}

          </section>

          {/* ========================================= */}
          {/* PANIER */}
          {/* ========================================= */}

          <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="mb-5 flex items-center justify-between">

              <h2 className="text-xl font-bold">
                Panier
              </h2>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium">
                {itemCount} article
                {itemCount > 1
                  ? "s"
                  : ""}
              </span>

            </div>

            {/* ITEMS */}

            {cart.length === 0 ? (
              <div className="rounded-xl bg-slate-950 py-10 text-center text-sm text-slate-500">
                Le panier est vide.
              </div>
            ) : (
              <div className="max-h-[420px] space-y-3 overflow-y-auto">

                {cart.map(
                  (item) => (
                    <div
                      key={
                        item.product.id
                      }
                      className="rounded-xl border border-slate-800 bg-slate-950 p-3"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-medium">
                            {
                              item.product
                                .name
                            }
                          </p>

                          <p className="text-sm text-slate-500">
                            {Number(
                              item.product
                                .price,
                            ).toFixed(
                              2,
                            )}{" "}
                            $ / unité
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item
                                .product
                                .id,
                            )
                          }
                          className="text-xs text-red-400 hover:underline"
                        >
                          Supprimer
                        </button>

                      </div>

                      <div className="mt-3 flex items-center justify-between">

                        <div className="flex items-center rounded-lg border border-slate-700">

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item
                                  .product
                                  .id,
                                item.quantity -
                                  1,
                              )
                            }
                            className="px-3 py-1 text-lg text-slate-300 hover:bg-slate-800"
                          >
                            −
                          </button>

                          <span className="min-w-8 text-center text-sm">
                            {
                              item.quantity
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item
                                  .product
                                  .id,
                                item.quantity +
                                  1,
                              )
                            }
                            className="px-3 py-1 text-lg text-slate-300 hover:bg-slate-800"
                          >
                            +
                          </button>

                        </div>

                        <p className="font-semibold">
                          {(
                            Number(
                              item
                                .product
                                .price,
                            ) *
                            item.quantity
                          ).toFixed(
                            2,
                          )}{" "}
                          $
                        </p>

                      </div>

                    </div>
                  ),
                )}

              </div>
            )}

            <div className="my-5 border-t border-slate-800" />

            {/* CLIENT */}

            <div className="mb-5">

              <label className="mb-2 block text-sm font-medium text-slate-300">
                Client
              </label>

              <select
                value={
                  selectedCustomer
                    ?.id ?? ""
                }
                onChange={(event) => {
                  const customer =
                    customers.find(
                      (item) =>
                        item.id ===
                        event.target
                          .value,
                    ) ?? null;

                  setSelectedCustomer(
                    customer,
                  );
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-white"
              >

                <option value="">
                  Client comptant / aucun
                </option>

                {customers.map(
                  (customer) => (
                    <option
                      key={
                        customer.id
                      }
                      value={
                        customer.id
                      }
                    >
                      {
                        getCustomerName(
                          customer,
                        )
                      }
                    </option>
                  ),
                )}

              </select>

            </div>

            {/* TOTAL */}

            <div className="space-y-2 text-sm">

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Sous-total
                </span>

                <span>
                  {subtotal.toFixed(
                    2,
                  )}{" "}
                  $
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Taxes ({taxRate}%)
                </span>

                <span>
                  {tax.toFixed(2)} $
                </span>
              </div>

              <div className="mt-3 flex justify-between border-t border-slate-800 pt-3 text-xl font-bold">

                <span>
                  Total
                </span>

                <span>
                  {total.toFixed(
                    2,
                  )}{" "}
                  $
                </span>

              </div>

            </div>

            {/* CHECKOUT */}

            <button
              type="button"
              onClick={checkout}
              disabled={
                cart.length === 0 ||
                checkoutLoading
              }
              className="mt-5 w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {checkoutLoading
                ? "Enregistrement..."
                : `Payer ${total.toFixed(
                    2,
                  )} $ comptant`}
            </button>

          </aside>

        </div>
      </div>
    </main>
  );
}