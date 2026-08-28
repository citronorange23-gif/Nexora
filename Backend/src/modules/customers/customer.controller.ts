
import type { Request, Response } from "express";

import {
  createCustomerSchema,
  updateCustomerSchema,
} from "./customer.schema.js";

import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "./customer.service.js";

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

    const input = createCustomerSchema.parse(req.body);

    const customer = await createCustomer(
      auth.organizationId,
      input,
    );

    return res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("CREATE_CUSTOMER_ERROR:", error);

    return res.status(400).json({
      success: false,
      error: "Unable to create customer",
    });
  }
}

export async function list(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const customers = await getCustomers(
      auth.organizationId,
    );

    return res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("GET_CUSTOMERS_ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch customers",
    });
  }
}

export async function getOne(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const customerId = req.params.id;

    if (typeof customerId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid customer ID",
      });
    }

    const customer = await getCustomerById(
      auth.organizationId,
      customerId,
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    return res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("GET_CUSTOMER_ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch customer",
    });
  }
}

export async function update(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const customerId = req.params.id;

    if (typeof customerId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid customer ID",
      });
    }

    const input = updateCustomerSchema.parse(req.body);

    const result = await updateCustomer(
      auth.organizationId,
      customerId,
      input,
    );

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    const customer = await getCustomerById(
      auth.organizationId,
      customerId,
    );

    return res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("UPDATE_CUSTOMER_ERROR:", error);

    return res.status(400).json({
      success: false,
      error: "Unable to update customer",
    });
  }
}

export async function remove(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const customerId = req.params.id;

    if (typeof customerId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid customer ID",
      });
    }

    const result = await deleteCustomer(
      auth.organizationId,
      customerId,
    );

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    return res.json({
      success: true,
      message: "Customer deleted",
    });
  } catch (error) {
    console.error("DELETE_CUSTOMER_ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to delete customer",
    });
  }
}