import { PrismaClient } from "@prisma/client";

import * as Events from "./events/seed.js";
import * as Organizations from "./organizations/seed.js";
import * as Users from "./users/seed.js";

const db = new PrismaClient();

const main = async () => {
  console.log("Seeding...");
  const users = await Users.load(db);
  console.table(users);

  const organizations = await Organizations.load(db);
  console.table(organizations);

  const events = await Events.load(db);
  console.table(events);
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
