import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { db } from "../../lib/db.js";
import { BUSINESS_MODULES } from "../business/business-modules.js";

import {
  BusinessType,
  ModuleKey,
  PermissionAction,
} from "../../generated/prisma/client.js";

import type {
  RegisterInput,
  LoginInput,
} from "./auth.schema.js";

const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  {
    module: ModuleKey;
    actions: PermissionAction[];
  }[]
> = {
  // OWNER = accès complet à tous les modules
  OWNER: Object.values(ModuleKey).map(
    (module) => ({
      module,
      actions: Object.values(PermissionAction),
    }),
  ),

  // ADMIN = accès complet sauf AI
  ADMIN: Object.values(ModuleKey)
    .filter(
      (module) => module !== ModuleKey.AI,
    )
    .map((module) => ({
      module,
      actions: Object.values(
        PermissionAction,
      ),
    })),

  // MANAGER = gestion opérationnelle
  MANAGER: [
    {
      module: ModuleKey.CRM,
      actions: [
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
      ],
    },

    {
      module: ModuleKey.INVENTORY,
      actions: [
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
      ],
    },

    {
      module: ModuleKey.POS,
      actions: [
        PermissionAction.VIEW,
        PermissionAction.CREATE,
      ],
    },

    {
      module: ModuleKey.SALES,
      actions: [
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
      ],
    },

    {
      module: ModuleKey.EMPLOYEES,
      actions: [
        PermissionAction.VIEW,
      ],
    },

    {
      module: ModuleKey.DOCUMENTS,
      actions: [
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
      ],
    },

    {
      module: ModuleKey.APPOINTMENTS,
      actions: [
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
      ],
    },

    {
      module: ModuleKey.ANALYTICS,
      actions: [
        PermissionAction.VIEW,
      ],
    },
  ],

  // EMPLOYEE = accès limité
  EMPLOYEE: [
    {
      module: ModuleKey.CRM,
      actions: [
        PermissionAction.VIEW,
      ],
    },

    {
      module: ModuleKey.INVENTORY,
      actions: [
        PermissionAction.VIEW,
      ],
    },

    {
      module: ModuleKey.POS,
      actions: [
        PermissionAction.VIEW,
        PermissionAction.CREATE,
      ],
    },

    {
      module: ModuleKey.SALES,
      actions: [
        PermissionAction.VIEW,
        PermissionAction.CREATE,
      ],
    },

    {
      module: ModuleKey.DOCUMENTS,
      actions: [
        PermissionAction.VIEW,
      ],
    },

    {
      module: ModuleKey.APPOINTMENTS,
      actions: [
        PermissionAction.VIEW,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
      ],
    },
  ],
};

export async function registerUser(
  input: RegisterInput,
) {
  const existingUser =
    await db.user.findUnique({
      where: {
        email: input.email,
      },
    });

  if (existingUser) {
    throw new Error(
      "EMAIL_ALREADY_EXISTS",
    );
  }

  const passwordHash =
    await bcrypt.hash(
      input.password,
      12,
    );

  const result =
    await db.$transaction(async (tx) => {
      // 1. Créer le user
      const user =
        await tx.user.create({
          data: {
            email: input.email,
            password: passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
          },
        });

      // 2. Créer l'organisation
      const organization =
        await tx.organization.create({
          data: {
            name: input.businessName,
          },
        });

      // 3. Créer les rôles système
      const roleDefinitions = [
        {
          name: "OWNER",
          description:
            "Business owner",
        },
        {
          name: "ADMIN",
          description:
            "Administrator",
        },
        {
          name: "MANAGER",
          description:
            "Manager",
        },
        {
          name: "EMPLOYEE",
          description:
            "Employee",
        },
      ];

      const roles =
        await Promise.all(
          roleDefinitions.map(
            (role) =>
              tx.role.create({
                data: {
                  name: role.name,
                  description:
                    role.description,
                  system: true,
                  organizationId:
                    organization.id,
                },
              }),
          ),
        );

      // 4. Créer les permissions
      //    pour chaque rôle système
      for (const role of roles) {
        const permissions =
          DEFAULT_ROLE_PERMISSIONS[
            role.name
          ];

        if (!permissions) {
          continue;
        }

        const permissionData =
          permissions.flatMap(
            (permission) =>
              permission.actions.map(
                (action) => ({
                  roleId: role.id,
                  module:
                    permission.module,
                  action,
                }),
              ),
          );

        if (
          permissionData.length > 0
        ) {
          await tx.rolePermission.createMany(
            {
              data: permissionData,
              skipDuplicates: true,
            },
          );
        }
      }

      // 5. Récupérer OWNER
      const ownerRole =
        roles.find(
          (role) =>
            role.name === "OWNER",
        );

      if (!ownerRole) {
        throw new Error(
          "OWNER_ROLE_NOT_FOUND",
        );
      }

      // 6. Ajouter le créateur
      //    comme OWNER
      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId:
            organization.id,
          roleId: ownerRole.id,
        },
      });

      // 7. Créer le Business
      await tx.business.create({
        data: {
          name: input.businessName,
          type:
            input.businessType as BusinessType,
          phone: input.phone,
          email:
            input.businessEmail,
          address: input.address,
          city: input.city,
          province: input.province,
          postalCode:
            input.postalCode,
          organizationId:
            organization.id,
        },
      });

      // 8. Activer les modules
      const moduleKeys =
        BUSINESS_MODULES[
          input.businessType as BusinessType
        ];

      const modules =
        await tx.module.findMany({
          where: {
            key: {
              in: moduleKeys,
            },
          },
        });

      if (
        modules.length !==
        moduleKeys.length
      ) {
        throw new Error(
          "MODULE_CONFIGURATION_INCOMPLETE",
        );
      }

      await tx.organizationModule.createMany(
        {
          data: modules.map(
            (module) => ({
              organizationId:
                organization.id,
              moduleId: module.id,
              enabled: true,
            }),
          ),
        },
      );

      return {
        user,
        organization,
        ownerRole,
      };
    });

    const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      "JWT_SECRET_NOT_CONFIGURED",
    );
  }

  // Récupérer les permissions du OWNER
  const ownerPermissions =
    await db.rolePermission.findMany({
      where: {
        roleId: result.ownerRole.id,
      },
    });

  // Générer le JWT
  const token = jwt.sign(
    {
      userId: result.user.id,
      organizationId:
        result.organization.id,
      roleId: result.ownerRole.id,
      role: result.ownerRole.name,
    },
    jwtSecret,
    {
      expiresIn: "7d",
    },
  );

  return {
    token,

    user: {
      id: result.user.id,
      email: result.user.email,
      firstName:
        result.user.firstName,
      lastName:
        result.user.lastName,
    },

    organization: {
      id: result.organization.id,
      name: result.organization.name,

      role: {
        id: result.ownerRole.id,
        name: result.ownerRole.name,
        system: result.ownerRole.system,
        permissions: ownerPermissions,
      },

      business: await db.business.findUnique({
        where: {
          organizationId:
            result.organization.id,
        },
      }),
    },
  };
}

export async function loginUser(
  input: LoginInput,
) {
  const user =
    await db.user.findUnique({
      where: {
        email: input.email,
      },

      include: {
        memberships: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },

            organization: {
              include: {
                business: true,
              },
            },
          },
        },
      },
    });

  if (!user) {
    throw new Error(
      "INVALID_CREDENTIALS",
    );
  }

  const passwordValid =
    await bcrypt.compare(
      input.password,
      user.password,
    );

  if (!passwordValid) {
    throw new Error(
      "INVALID_CREDENTIALS",
    );
  }

  const memberships =
    user.memberships;

  if (
    memberships.length === 0
  ) {
    throw new Error(
      "NO_ORGANIZATION",
    );
  }

  const membership =
    memberships[0];

  const jwtSecret =
    process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      "JWT_SECRET_NOT_CONFIGURED",
    );
  }

  const token = jwt.sign(
    {
      userId: user.id,
      organizationId:
        membership.organizationId,
      roleId: membership.roleId,
      role: membership.role.name,
    },
    jwtSecret,
    {
      expiresIn: "7d",
    },
  );

  return {
    token,

    user: {
      id: user.id,
      email: user.email,
      firstName:
        user.firstName,
      lastName:
        user.lastName,
    },

    organization: {
      id: membership.organization.id,
      name: membership.organization.name,

      role: {
        id: membership.role.id,
        name: membership.role.name,
        system:
          membership.role.system,
        permissions:
          membership.role
            .permissions,
      },

      business:
        membership.organization
          .business,
    },
  };
}