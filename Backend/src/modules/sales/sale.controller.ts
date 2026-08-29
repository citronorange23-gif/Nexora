import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import { createSaleSchema } from "./sale.schema.js";
import {
  createSale,
  getSales,
  getSaleById,
  cancelSale,
  refundSale,
} from "./sale.service.js";


function getAuth(req: Request) {
  return (req as AuthenticatedRequest).user;
}

export async function create(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const input = createSaleSchema.parse(req.body);

    const sale = await createSale(
      auth.organizationId,
      input,
    );

    return res.status(201).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      if (error.message === "CUSTOMER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Customer not found",
        });
      }

      if (error.message === "PRODUCT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      if (
        error.message.startsWith("INSUFFICIENT_STOCK:")
      ) {
        return res.status(409).json({
          success: false,
          error: "Insufficient stock",
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: "Unable to create sale",
    });
  }
}

export async function getAll(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const sales = await getSales(auth.organizationId);

    return res.json({
      success: true,
      data: sales,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch sales",
    });
  }
}

export async function getOne(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const saleId = req.params.id;

    if (!saleId || Array.isArray(saleId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid sale ID",
      });
    }

    const sale = await getSaleById(
      auth.organizationId,
      saleId,
    );

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: "Sale not found",
      });
    }

    return res.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch sale",
    });
  }
}

export async function cancel(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const saleId = req.params.id;

    if (!saleId || Array.isArray(saleId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid sale ID",
      });
    }

    const sale = await cancelSale(
      auth.organizationId,
      saleId,
    );

    return res.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      if (error.message === "SALE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Sale not found",
        });
      }

      if (error.message === "SALE_NOT_COMPLETED") {
        return res.status(409).json({
          success: false,
          error: "Sale cannot be cancelled",
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: "Unable to cancel sale",
    });
  }
}

export async function refund(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const saleId = req.params.id;

    if (!saleId || Array.isArray(saleId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid sale ID",
      });
    }

    const sale = await refundSale(
      auth.organizationId,
      saleId,
    );

    return res.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      if (error.message === "SALE_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Sale not found",
        });
      }

      if (error.message === "SALE_NOT_COMPLETED") {
        return res.status(409).json({
          success: false,
          error: "Sale cannot be refunded",
        });
      }

      if (error.message === "PAYMENT_NOT_FOUND") {
        return res.status(409).json({
          success: false,
          error: "Payment not found",
        });
      }

      if (error.message === "ALREADY_REFUNDED") {
        return res.status(409).json({
          success: false,
          error: "Sale already refunded",
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: "Unable to refund sale",
    });
  }
}