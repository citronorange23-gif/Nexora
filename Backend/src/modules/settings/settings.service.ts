import { db } from "../../lib/db.js";

export async function getBusinessSettings(organizationId: string) {
  return db.business.findUnique({
    where: { organizationId },
    select: { name: true, receiptEmail: true },
  });
}

export async function updateReceiptEmail(
  organizationId: string,
  receiptEmail: string,
) {
  return db.business.update({
    where: { organizationId },
    data: { receiptEmail },
    select: { name: true, receiptEmail: true },
  });
}