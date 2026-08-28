import { BusinessType, ModuleKey } from "../../generated/prisma/client.js";

const COMMON_MODULES: ModuleKey[] = [
  ModuleKey.CRM,
  ModuleKey.SALES,
  ModuleKey.EMPLOYEES,
  ModuleKey.DOCUMENTS,
  ModuleKey.FINANCE,
  ModuleKey.ANALYTICS,
  ModuleKey.AI,
];

export const BUSINESS_MODULES: Record<BusinessType, ModuleKey[]> = {
  [BusinessType.RETAIL]: [
    ...COMMON_MODULES,
    ModuleKey.INVENTORY,
    ModuleKey.POS,
  ],

  [BusinessType.RESTAURANT]: [
    ...COMMON_MODULES,
    ModuleKey.INVENTORY,
    ModuleKey.POS,
    ModuleKey.APPOINTMENTS,
  ],

  [BusinessType.SALON]: [
    ...COMMON_MODULES,
    ModuleKey.APPOINTMENTS,
    ModuleKey.POS,
  ],

  [BusinessType.BARBERSHOP]: [
    ...COMMON_MODULES,
    ModuleKey.APPOINTMENTS,
    ModuleKey.POS,
  ],

  [BusinessType.GARAGE]: [
    ...COMMON_MODULES,
    ModuleKey.INVENTORY,
    ModuleKey.POS,
    ModuleKey.APPOINTMENTS,
  ],

  [BusinessType.REAL_ESTATE]: [
    ...COMMON_MODULES,
    ModuleKey.APPOINTMENTS,
  ],

  [BusinessType.GYM]: [
    ...COMMON_MODULES,
    ModuleKey.APPOINTMENTS,
    ModuleKey.POS,
  ],

  [BusinessType.CLINIC]: [
    ...COMMON_MODULES,
    ModuleKey.APPOINTMENTS,
  ],

  [BusinessType.FREELANCER]: [
    ...COMMON_MODULES,
    ModuleKey.APPOINTMENTS,
  ],

  [BusinessType.OTHER]: [
    ...COMMON_MODULES,
  ],
};