// Backend/src/modules/documents/quote.controller.ts

import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  createQuoteSchema,
  updateQuoteStatusSchema,
  listQuotesQuerySchema,
} from "./quote.schema.js";
import {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuoteStatus,
  convertQuoteToSale,
  generateQuotePdf,
} from "./quote.service.js";

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).user;
}

export async function createQuoteHandler(req: Request, res: Response) {
  try {
    const auth = getAuth(req);

    const input = createQuoteSchema.parse(req.body);

    const quote = await createQuote(auth.organizationId, input);

    return res.status(201).json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return res.status(400).json({
        success: false,
        error: "One or more products were not found",
      });
    }

    return res.status(400).json({
      success: false,
      error: "Unable to create quote",
    });
  }
}

export async function getAllQuotes(req: Request, res: Response) {
  try {
    const auth = getAuth(req);

    const query = listQuotesQuerySchema.parse(req.query);

    const quotes = await getQuotes(auth.organizationId, query);

    return res.json({
      success: true,
      data: quotes,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      error: "Unable to fetch quotes",
    });
  }
}

export async function getOneQuote(req: Request, res: Response) {
  try {
    const auth = getAuth(req);

    const quoteId = req.params.id;

    if (!quoteId || Array.isArray(quoteId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid quote ID",
      });
    }

    const quote = await getQuoteById(auth.organizationId, quoteId);

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: "Quote not found",
      });
    }

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch quote",
    });
  }
}

export async function updateQuoteStatusHandler(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const quoteId = req.params.id;

    if (!quoteId || Array.isArray(quoteId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid quote ID",
      });
    }

    const { status } = updateQuoteStatusSchema.parse(req.body);

    const quote = await updateQuoteStatus(
      auth.organizationId,
      quoteId,
      status,
    );

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "QUOTE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: "Quote not found",
      });
    }

    return res.status(400).json({
      success: false,
      error: "Unable to update quote status",
    });
  }
}

export async function convertQuoteHandler(req: Request, res: Response) {
  try {
    const auth = getAuth(req);

    const quoteId = req.params.id;

    if (!quoteId || Array.isArray(quoteId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid quote ID",
      });
    }

    const sale = await convertQuoteToSale(auth.organizationId, quoteId);

    return res.status(201).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "QUOTE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: "Quote not found",
      });
    }

    if (error instanceof Error && error.message === "QUOTE_NOT_ACCEPTED") {
      return res.status(400).json({
        success: false,
        error: "Quote must be ACCEPTED to be converted",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Unable to convert quote",
    });
  }
}

export async function downloadQuotePdf(req: Request, res: Response) {
  try {
    const auth = getAuth(req);

    const quoteId = req.params.id;

    if (!quoteId || Array.isArray(quoteId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid quote ID",
      });
    }

    const { quote, buffer } = await generateQuotePdf(
      auth.organizationId,
      quoteId,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${quote.number}.pdf"`,
    );

    return res.send(buffer);
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "QUOTE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: "Quote not found",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Unable to generate quote PDF",
    });
  }
}