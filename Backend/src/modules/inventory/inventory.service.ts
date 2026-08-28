import { db } from "../../lib/db.js";

import type {
  StockOperationInput,
  AdjustStockInput,
} from "./inventory.schema.js";

export async function addStock(
  organizationId: string,
  productId: string,
  input: StockOperationInput,
) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    if (!product.inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    const inventory = await tx.inventory.update({
      where: {
        productId,
      },
      data: {
        quantity: {
          increment: input.quantity,
        },
      },
    });

    await tx.inventoryMovement.create({
      data: {
        type: "PURCHASE",
        quantity: input.quantity,
        reason: input.reason ?? "Stock added",
        productId,
        organizationId,
      },
    });

    return inventory;
  });
}

export async function removeStock(
  organizationId: string,
  productId: string,
  input: StockOperationInput,
) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    if (!product.inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    if (product.inventory.quantity < input.quantity) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    const inventory = await tx.inventory.update({
      where: {
        productId,
      },
      data: {
        quantity: {
          decrement: input.quantity,
        },
      },
    });

    await tx.inventoryMovement.create({
      data: {
        type: "SALE",
        quantity: -input.quantity,
        reason: input.reason ?? "Stock removed",
        productId,
        organizationId,
      },
    });

    return inventory;
  });
}

export async function adjustStock(
  organizationId: string,
  productId: string,
  input: AdjustStockInput,
) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    if (!product.inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    const oldQuantity = product.inventory.quantity;

    const inventory = await tx.inventory.update({
      where: {
        productId,
      },
      data: {
        quantity: input.quantity,
      },
    });

    const difference = input.quantity - oldQuantity;

    if (difference !== 0) {
      await tx.inventoryMovement.create({
        data: {
          type: "ADJUSTMENT",
          quantity: difference,
          reason: input.reason ?? "Stock adjustment",
          productId,
          organizationId,
        },
      });
    }

    return inventory;
  });
}

export async function getInventory(
  organizationId: string,
) {
  return db.product.findMany({
    where: {
      organizationId,
      inventory: {
        isNot: null,
      },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      price: true,
      active: true,
      inventory: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getProductMovements(
  organizationId: string,
  productId: string,
) {
  const product = await db.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  return db.inventoryMovement.findMany({
    where: {
      organizationId,
      productId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}