import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const MODULES = [
  {
    key: "CRM",
    name: "Clients",
    description: "Gestion des clients",
  },
  {
    key: "INVENTORY",
    name: "Stock",
    description: "Gestion des stocks",
  },
  {
    key: "PRODUCTS",
    name: "Produits",
    description: "Gestion des produits",
  },
  {
    key: "POS",
    name: "Caisse",
    description: "Point de vente",
  },
  {
    key: "SALES",
    name: "Ventes",
    description: "Gestion des ventes",
  },
  {
    key: "EMPLOYEES",
    name: "Équipe",
    description: "Gestion des employés",
  },
  {
    key: "ROLES",
    name: "Accès",
    description: "Gestion des rôles et permissions",
  },
  {
    key: "DOCUMENTS",
    name: "Documents",
    description: "Gestion des documents",
  },
  {
    key: "APPOINTMENTS",
    name: "Rendez-vous",
    description: "Gestion des rendez-vous",
  },
  {
    key: "FINANCE",
    name: "Finances",
    description: "Gestion financière",
  },
  {
    key: "ANALYTICS",
    name: "Statistiques",
    description: "Analyse des performances",
  },
  {
    key: "AI",
    name: "Assistant IA",
    description: "Assistant intelligent",
  },
] as const;

async function main() {
  for (const module of MODULES) {
    await db.module.upsert({
      where: {
        key: module.key,
      },
      update: {
        name: module.name,
        description: module.description,
      },
      create: {
        key: module.key,
        name: module.name,
        description: module.description,
      },
    });
  }

  console.log("✅ Modules Nexora créés/configurés");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });