import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  stockOperationSchema,
  adjustStockSchema,
} from "./inventory.schema.js";

import {
  addStock,
  removeStock,
  adjustStock,
  getInventory,
  getProductMovements,
} from "./inventory.service.js";

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).user;
}

function getProductId(req: Request) {
  const productId = req.params.productId;

  if (typeof productId !== "string") {
    return null;
  }

  return productId;
}

export async function add(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);
    const productId = getProductId(req);

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID",
      });
    }

    const input = stockOperationSchema.parse(req.body);

    const inventory = await addStock(
      auth.organizationId,
      productId,
      input,
    );

    return res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      if (error.message === "INVENTORY_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Inventory not found",
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: "Unable to add stock",
    });
  }
}

export async function remove(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);
    const productId = getProductId(req);

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID",
      });
    }

    const input = stockOperationSchema.parse(req.body);

    const inventory = await removeStock(
      auth.organizationId,
      productId,
      input,
    );

    return res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      if (error.message === "INVENTORY_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Inventory not found",
        });
      }

      if (error.message === "INSUFFICIENT_STOCK") {
        return res.status(409).json({
          success: false,
          error: "Insufficient stock",
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: "Unable to remove stock",
    });
  }
}

export async function adjust(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);
    const productId = getProductId(req);

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID",
      });
    }

    const input = adjustStockSchema.parse(req.body);

    const inventory = await adjustStock(
      auth.organizationId,
      productId,
      input,
    );

    return res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      if (error.message === "INVENTORY_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Inventory not found",
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: "Unable to adjust stock",
    });
  }
}

export async function list(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const inventory = await getInventory(
      auth.organizationId,
    );

    return res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch inventory",
    });
  }
}

export async function movements(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);
    const productId = getProductId(req);

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID",
      });
    }

    const result = await getProductMovements(
      auth.organizationId,
      productId,
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PRODUCT_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Unable to fetch movements",
    });
  }
}