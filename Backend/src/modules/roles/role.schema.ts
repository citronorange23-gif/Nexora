import { z } from "zod";

const permissionActionSchema = z.enum([
  "VIEW",
  "CREATE",
  "UPDATE",
  "DELETE",
]);

const moduleKeySchema = z.enum([
  "CRM",
  "INVENTORY",
  "POS",
  "SALES",
  "EMPLOYEES",
  "ROLES",
  "DOCUMENTS",
  "APPOINTMENTS",
  "FINANCE",
  "ANALYTICS",
  "AI",
]);

const permissionsSchema = z.array(
  z.object({
    module: moduleKeySchema,
    actions: z
      .array(permissionActionSchema)
      .default([]),
  }),
);

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(50, "Role name is too long"),

  description: z
    .string()
    .trim()
    .max(255, "Description is too long")
    .optional(),

  permissions: permissionsSchema.default([]),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(50, "Role name is too long")
    .optional(),

  description: z
    .string()
    .trim()
    .max(255, "Description is too long")
    .optional(),

  permissions: permissionsSchema.optional(),
});

export type CreateRoleInput = z.infer<
  typeof createRoleSchema
>;

export type UpdateRoleInput = z.infer<
  typeof updateRoleSchema
>;