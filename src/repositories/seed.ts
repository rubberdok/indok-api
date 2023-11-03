import { PrismaClient } from "@prisma/client";

import * as Users from "./users/seed.js";

const db = new PrismaClient();

const main = async () => {
  console.log("Seeding...");
  const users = await Users.load(db);
  console.table(users);
};

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  console.log("Finished");
  await db.$disconnect();
}
