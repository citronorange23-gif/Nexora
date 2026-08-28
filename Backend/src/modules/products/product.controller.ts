import type { Request, Response } from "express";

import {
  createProductSchema,
  updateProductSchema,
} from "./product.schema.js";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  lookupProductByBarcode
} from "./product.service.js";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).user;
}

export async function create(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const input = createProductSchema.parse(req.body);

    const product = await createProduct(
      auth.organizationId,
      input,
    );

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      error: "Unable to create product",
    });
  }
}

export async function list(
  req: Request,
  res: Response,
) {
  try {
    console.log("1 - LIST PRODUCTS");

    const auth = getAuth(req);

    console.log("2 - AUTH:", auth);

    const products = await getProducts(
      auth.organizationId,
    );

    console.log("3 - PRODUCTS:", products.length);

    return res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("PRODUCT LIST ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch products",
    });
  }
}

export async function getOne(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const productId = req.params.id;

    if (typeof productId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID",
      });
    }

    const product = await getProductById(
      auth.organizationId,
      productId,
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch product",
    });
  }
}

export async function update(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const productId = req.params.id;

    if (typeof productId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID",
      });
    }

    const input = updateProductSchema.parse(req.body);

    const result = await updateProduct(
      auth.organizationId,
      productId,
      input,
    );

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    const product = await getProductById(
      auth.organizationId,
      productId,
    );

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      error: "Unable to update product",
    });
  }
}

export async function remove(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const productId = req.params.id;

    if (typeof productId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid product ID",
      });
    }

    const result = await deleteProduct(
      auth.organizationId,
      productId,
    );

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    return res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to delete product",
    });
  }
}



export async function lookupProduct(
  req: Request,
  res: Response,
) {
  try {
    const barcode = String(
      req.query.barcode ?? "",
    ).trim();

    if (!barcode) {
      return res.status(400).json({
        message: "BARCODE_REQUIRED",
      });
    }

    const product =
      await lookupProductByBarcode(barcode);

    if (!product) {
      return res.status(404).json({
        message: "PRODUCT_NOT_FOUND",
        barcode,
      });
    }

    return res.status(200).json({
      product,
    });
  } catch (error) {
    console.error(
      "PRODUCT_LOOKUP_ERROR:",
      error,
    );

    if (
      error instanceof Error &&
      error.message ===
        "UPC_API_RATE_LIMIT"
    ) {
      return res.status(429).json({
        message: "UPC_API_RATE_LIMIT",
      });
    }

    return res.status(502).json({
      message: "UPC_API_ERROR",
    });
  }
}