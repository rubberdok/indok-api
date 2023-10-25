import { PrismaClient } from "@prisma/client";

import * as Users from "./users/seed.js";

const db = new PrismaClient();

const main = async () => {
  console.log("Seeding...");
  Users.load(db);
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
