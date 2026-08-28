import { db } from "../../lib/db.js";
import { BusinessType } from "../../generated/prisma/client.js";
import { BUSINESS_MODULES } from "../business/business-modules.js";

export async function enableBusinessModules(
  organizationId: string,
  businessType: BusinessType,
) {
  const moduleKeys = BUSINESS_MODULES[businessType];

  if (!moduleKeys) {
    throw new Error(`Unsupported business type: ${businessType}`);
  }

  const modules = await db.module.findMany({
    where: {
      key: {
        in: moduleKeys,
      },
    },
  });

  if (modules.length !== moduleKeys.length) {
    const foundKeys = new Set(modules.map((module) => module.key));

    const missingModules = moduleKeys.filter(
      (key) => !foundKeys.has(key),
    );

    throw new Error(
      `Missing modules in database: ${missingModules.join(", ")}`,
    );
  }

  await db.organizationModule.createMany({
    data: modules.map((module) => ({
      organizationId,
      moduleId: module.id,
      enabled: true,
    })),
    skipDuplicates: true,
  });

  return modules;
}