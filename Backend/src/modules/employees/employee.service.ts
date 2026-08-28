import bcrypt from "bcrypt";

import { db } from "../../lib/db.js";

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  createdAt: true,
};

export async function getEmployees(
  organizationId: string,
) {
  return db.organizationMember.findMany({
    where: {
      organizationId,
    },
    include: {
      user: {
        select: userSelect,
      },
      role: {
        include: {
          permissions: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function createEmployee(
  organizationId: string,
  input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    roleId: string;
  },
) {
  return db.$transaction(async (tx) => {
    // Vérifier que le rôle appartient bien à cette organisation
    const role = await tx.role.findFirst({
      where: {
        id: input.roleId,
        organizationId,
      },
    });

    if (!role) {
      throw new Error("ROLE_NOT_FOUND");
    }

    // On ne permet pas de créer un OWNER
    if (role.name === "OWNER") {
      throw new Error("CANNOT_CREATE_OWNER");
    }

    const existingUser = await tx.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (existingUser) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const hashedPassword = await bcrypt.hash(
      input.password,
      12,
    );

    const user = await tx.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    return tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId,
        roleId: role.id,
      },
      include: {
        user: {
          select: userSelect,
        },
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });
  });
}

export async function updateEmployeeRole(
  organizationId: string,
  memberId: string,
  roleId: string,
) {
  const member =
    await db.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
      include: {
        role: true,
      },
    });

  if (!member) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }

  if (member.role.name === "OWNER") {
    throw new Error("CANNOT_MODIFY_OWNER");
  }

  const role = await db.role.findFirst({
    where: {
      id: roleId,
      organizationId,
    },
  });

  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
  }

  if (role.name === "OWNER") {
    throw new Error("CANNOT_ASSIGN_OWNER");
  }

  return db.organizationMember.update({
    where: {
      id: member.id,
    },
    data: {
      roleId: role.id,
    },
    include: {
      user: {
        select: userSelect,
      },
      role: {
        include: {
          permissions: true,
        },
      },
    },
  });
}

export async function removeEmployee(
  organizationId: string,
  memberId: string,
) {
  const member =
    await db.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
      include: {
        role: true,
      },
    });

  if (!member) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }

  if (member.role.name === "OWNER") {
    throw new Error("CANNOT_DELETE_OWNER");
  }

  return db.organizationMember.delete({
    where: {
      id: member.id,
    },
  });
}