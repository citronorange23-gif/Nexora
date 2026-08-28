import { db } from "./db.js";

async function main() {
  const users = await db.user.count();

  console.log(`👤 Users: ${users}`);
}

main()
  .catch((error) => {
    console.error("❌ Database error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });