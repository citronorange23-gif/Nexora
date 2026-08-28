import type {
  ModuleKey,
  PermissionAction,
} from "../../generated/prisma/client.js";

import type { PrismaClient } from "../../generated/prisma/client.js";

type TransactionClient = Parameters<
  PrismaClient["$transaction"]
>[0] extends (tx: infer T) => unknown
  ? T
  : never;

const ALL_ACTIONS: PermissionAction[] = [
  "VIEW",
  "CREATE",
  "UPDATE",
  "DELETE",
];

const ALL_MODULES: ModuleKey[] = [
  "CRM",
  "INVENTORY",
  "PRODUCTS",
  "POS",
  "SALES",
  "EMPLOYEES",
  "ROLES",
  "DOCUMENTS",
  "APPOINTMENTS",
  "FINANCE",
  "ANALYTICS",
  "AI",
];

const SYSTEM_ROLES = [
  {
    name: "OWNER",
    description: "Business owner",
  },
  {
    name: "ADMIN",
    description: "Administrator",
  },
  {
    name: "MANAGER",
    description: "Manager",
  },
  {
    name: "EMPLOYEE",
    description: "Employee",
  },
] as const;

const ROLE_PERMISSIONS: Record<
  string,
  Partial<Record<ModuleKey, PermissionAction[]>>
> = {
  OWNER: Object.fromEntries(
    ALL_MODULES.map((module) => [
      module,
      ALL_ACTIONS,
    ]),
  ),

  ADMIN: {
    CRM: ALL_ACTIONS,
    INVENTORY: ALL_ACTIONS,
    POS: ALL_ACTIONS,
    SALES: ALL_ACTIONS,
    EMPLOYEES: [
      "VIEW",
      "CREATE",
      "UPDATE",
      "DELETE",
    ],
    DOCUMENTS: ALL_ACTIONS,
    APPOINTMENTS: ALL_ACTIONS,
    FINANCE: ALL_ACTIONS,
    ANALYTICS: ["VIEW"],
    AI: ALL_ACTIONS,
  },

  MANAGER: {
    CRM: [
      "VIEW",
      "CREATE",
      "UPDATE",
    ],
    INVENTORY: [
      "VIEW",
      "CREATE",
      "UPDATE",
    ],
    POS: [
      "VIEW",
      "CREATE",
    ],
    SALES: [
      "VIEW",
      "CREATE",
      "UPDATE",
    ],
    EMPLOYEES: ["VIEW"],
    DOCUMENTS: [
      "VIEW",
      "CREATE",
      "UPDATE",
    ],
    APPOINTMENTS: [
      "VIEW",
      "CREATE",
      "UPDATE",
    ],
    FINANCE: ["VIEW"],
    ANALYTICS: ["VIEW"],
    AI: ["VIEW"],
  },

  EMPLOYEE: {
    CRM: [
      "VIEW",
      "CREATE",
      "UPDATE",
    ],
    INVENTORY: ["VIEW"],
    POS: [
      "VIEW",
      "CREATE",
    ],
    SALES: [
      "VIEW",
      "CREATE",
    ],
    DOCUMENTS: ["VIEW"],
    APPOINTMENTS: [
      "VIEW",
      "CREATE",
      "UPDATE",
    ],
  },
};

export async function createSystemRoles(
  tx: TransactionClient,
  organizationId: string,
) {
  const roles = await Promise.all(
    SYSTEM_ROLES.map((role) =>
      tx.role.create({
        data: {
          name: role.name,
          description: role.description,
          system: true,
          organizationId,
        },
      }),
    ),
  );

  for (const role of roles) {
    const permissions =
      ROLE_PERMISSIONS[role.name];

    if (!permissions) {
      continue;
    }

    const permissionData = Object.entries(
      permissions,
    ).flatMap(
      ([module, actions]) =>
        (actions ?? []).map((action) => ({
          roleId: role.id,
          module: module as ModuleKey,
          action,
        })),
    );

    if (permissionData.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionData,
        skipDuplicates: true,
      });
    }
  }

  return roles;
}