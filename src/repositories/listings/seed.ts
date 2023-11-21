import { faker } from "@faker-js/faker";
import { Prisma, PrismaClient } from "@prisma/client";

faker.seed(392103);

const listingCreateInput: Prisma.ListingCreateInput[] = [
  makeFakeListing(),
  makeFakeListing(),
  makeFakeListing(),
  makeFakeListing(),
  makeFakeListing(),
  makeFakeListing(),
  makeFakeListing(),
  makeFakeListing(),
];

function makeFakeListing(): Prisma.ListingCreateInput {
  const orgId = faker.string.uuid();
  return {
    id: faker.string.uuid(),
    name: faker.word.adjective(),
    description: faker.lorem.paragraph(),
    closesAt: faker.date.future(),
    applicationUrl: faker.internet.url(),
    organization: {
      connectOrCreate: {
        where: {
          id: orgId,
        },
        create: {
          id: orgId,
          name: faker.company.name(),
          description: faker.lorem.paragraph(),
        },
      },
    },
  };
}

export async function load(db: PrismaClient) {
  console.log("Seeding listings...");

  for (const listing of listingCreateInput) {
    const { id, ...rest } = listing;
    await db.listing.upsert({
      where: {
        id,
      },
      update: {
        ...rest,
      },
      create: {
        id,
        ...rest,
      },
    });
  }

  const listings = await db.listing.findMany({
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  });
  return listings;
}
