import { db } from "../../lib/db.js";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "./customer.schema.js";

export async function createCustomer(
  organizationId: string,
  input: CreateCustomerInput,
) {
  return db.customer.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      organizationId,
    },
  });
}

export async function getCustomers(
  organizationId: string,
) {
  return db.customer.findMany({
    where: {
      organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCustomerById(
  organizationId: string,
  customerId: string,
) {
  return db.customer.findFirst({
    where: {
      id: customerId,
      organizationId,
    },
    include: {
      sales: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payment: true,
        },
      },
    },
  });
}

export async function updateCustomer(
  organizationId: string,
  customerId: string,
  input: UpdateCustomerInput,
) {
  return db.customer.updateMany({
    where: {
      id: customerId,
      organizationId,
    },
    data: input,
  });
}

export async function deleteCustomer(
  organizationId: string,
  customerId: string,
) {
  return db.customer.deleteMany({
    where: {
      id: customerId,
      organizationId,
    },
  });
}