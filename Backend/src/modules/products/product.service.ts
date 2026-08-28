import { db } from "../../lib/db.js";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "./product.schema.js";

export async function createProduct(
  organizationId: string,
  input: CreateProductInput,
) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        description: input.description,
        type: input.type,
        price: input.price,
        costPrice: input.costPrice,
        organizationId,

        inventory: {
          create: {
            quantity: input.initialStock,
            minStock: input.minStock,
            maxStock: input.maxStock,
          },
        },
      },
      include: {
        inventory: true,
      },
    });

    if (input.initialStock > 0) {
      await tx.inventoryMovement.create({
        data: {
          type: "PURCHASE",
          quantity: input.initialStock,
          reason: "Initial stock",
          productId: product.id,
          organizationId,
        },
      });
    }

    return product;
  });
}

export async function getProducts(
  organizationId: string,
  all: boolean = true,
) {
  return db.product.findMany({
    where: {
      organizationId,
      ...(all ? {} : { active: true }),
    },
    include: {
      inventory: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getProductById(
  organizationId: string,
  productId: string,
) {
  return db.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
    include: {
      inventory: true,
      movements: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  });
}

export async function updateProduct(
  organizationId: string,
  productId: string,
  input: UpdateProductInput,
) {
  const { minStock, maxStock, ...productData } = input;

  return db.$transaction(async (tx) => {
    const result = await tx.product.updateMany({
      where: {
        id: productId,
        organizationId,
      },
      data: productData,
    });

    if (
      result.count > 0 &&
      (minStock !== undefined || maxStock !== undefined)
    ) {
      await tx.inventory.updateMany({
        where: {
          productId,
        },
        data: {
          ...(minStock !== undefined ? { minStock } : {}),
          ...(maxStock !== undefined ? { maxStock } : {}),
        },
      });
    }

    return result;
  });
}

export async function deleteProduct(
  organizationId: string,
  productId: string,
) {
  return db.product.deleteMany({
    where: {
      id: productId,
      organizationId,
    },
  });
}

export async function lookupProductByBarcode(barcode: string) {
  const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s max

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (response.status === 404) return null;
    if (response.status === 429) throw new Error("UPC_API_RATE_LIMIT");
    if (!response.ok) throw new Error("UPC_API_ERROR");

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    return {
      barcode: item.ean ?? item.upc ?? item.gtin ?? barcode,
      name: item.title ?? "",
      description: item.description ?? "",
      brand: item.brand ?? "",
      category: item.category ?? "",
      image: item.images?.[0] ?? null,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("UPC_API_TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

