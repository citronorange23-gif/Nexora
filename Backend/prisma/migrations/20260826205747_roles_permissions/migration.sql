-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('VIEW', 'CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "module" "ModuleKey" NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roles_organizationId_idx" ON "roles" ("organizationId");

CREATE UNIQUE INDEX "roles_organizationId_name_key" ON "roles" ("organizationId", "name");

CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions" ("roleId");

CREATE UNIQUE INDEX "role_permissions_roleId_module_action_key" ON "role_permissions" ("roleId", "module", "action");

-- Ajouter roleId temporairement nullable
ALTER TABLE "organization_members" ADD COLUMN "roleId" TEXT;

-- Créer les rôles système pour chaque organisation
INSERT INTO
    "roles" (
        "id",
        "name",
        "description",
        "system",
        "organizationId",
        "createdAt",
        "updatedAt"
    )
SELECT gen_random_uuid ()::text, r."name", r."name", true, o."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o
    CROSS JOIN (
        VALUES ('OWNER'), ('ADMIN'), ('MANAGER'), ('EMPLOYEE')
    ) AS r ("name");

-- Transférer les anciens rôles vers roleId
UPDATE "organization_members" om
SET
    "roleId" = r."id"
FROM "roles" r
WHERE
    r."organizationId" = om."organizationId"
    AND r."name" = om."role"::text;

-- Vérification avant de continuer
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "organization_members"
        WHERE "roleId" IS NULL
    ) THEN
        RAISE EXCEPTION 'Migration failed: some members have no roleId';
    END IF;
END $$;

-- Maintenant roleId peut devenir obligatoire
ALTER TABLE "organization_members"
ALTER COLUMN "roleId"
SET NOT NULL;

-- Maintenant seulement, on supprime l'ancien role
ALTER TABLE "organization_members" DROP COLUMN "role";

-- Index roleId
CREATE INDEX "organization_members_roleId_idx" ON "organization_members" ("roleId");

-- Foreign keys
ALTER TABLE "organization_members"
ADD CONSTRAINT "organization_members_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roles"
ADD CONSTRAINT "roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;