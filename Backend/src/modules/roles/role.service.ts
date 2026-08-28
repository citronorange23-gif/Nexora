import { db } from "../../lib/db.js";

import type {
  ModuleKey,
  PermissionAction,
} from "../../generated/prisma/client.js";

const roleInclude = {
  permissions: true,
};

export async function getRoles(
  organizationId: string,
) {
  return db.role.findMany({
    where: {
      organizationId,
    },
    include: roleInclude,
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getRole(
  organizationId: string,
  roleId: string,
) {
  const role = await db.role.findFirst({
    where: {
      id: roleId,
      organizationId,
    },
    include: roleInclude,
  });

  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
  }

  return role;
}

export async function createRole(
  organizationId: string,
  input: {
    name: string;
    description?: string;
    permissions: {
      module: ModuleKey;
      actions: PermissionAction[];
    }[];
  },
) {
  const existingRole = await db.role.findFirst({
    where: {
      organizationId,
      name: input.name,
    },
  });

  if (existingRole) {
    throw new Error("ROLE_ALREADY_EXISTS");
  }

  return db.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        name: input.name,
        description: input.description,
        system: false,
        organizationId,
      },
    });

    const permissionData =
      input.permissions.flatMap(
        (permission) =>
          permission.actions.map((action) => ({
            roleId: role.id,
            module: permission.module,
            action,
          })),
      );

    if (permissionData.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionData,
        skipDuplicates: true,
      });
    }

    return tx.role.findUniqueOrThrow({
      where: {
        id: role.id,
      },
      include: roleInclude,
    });
  });
}

export async function updateRole(
  organizationId: string,
  roleId: string,
  input: {
    name?: string;
    description?: string;
    permissions?: {
      module: ModuleKey;
      actions: PermissionAction[];
    }[];
  },
) {
  const role = await db.role.findFirst({
    where: {
      id: roleId,
      organizationId,
    },
  });

  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
  }

  if (role.system) {
    throw new Error("CANNOT_MODIFY_SYSTEM_ROLE");
  }

  return db.$transaction(async (tx) => {
    await tx.role.update({
      where: {
        id: role.id,
      },
      data: {
        name: input.name,
        description: input.description,
      },
    });

    if (input.permissions !== undefined) {
      await tx.rolePermission.deleteMany({
        where: {
          roleId: role.id,
        },
      });

      const permissionData =
        input.permissions.flatMap(
          (permission) =>
            permission.actions.map((action) => ({
              roleId: role.id,
              module: permission.module,
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

    return tx.role.findUniqueOrThrow({
      where: {
        id: role.id,
      },
      include: roleInclude,
    });
  });
}

export async function deleteRole(
  organizationId: string,
  roleId: string,
) {
  return db.$transaction(async (tx) => {
    const role = await tx.role.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
    });

    if (!role) {
      throw new Error("ROLE_NOT_FOUND");
    }

    if (role.system) {
      throw new Error("CANNOT_DELETE_SYSTEM_ROLE");
    }

    const members =
      await tx.organizationMember.count({
        where: {
          roleId: role.id,
        },
      });

    if (members > 0) {
      throw new Error("ROLE_IN_USE");
    }

    return tx.role.delete({
      where: {
        id: role.id,
      },
    });
  });
}
