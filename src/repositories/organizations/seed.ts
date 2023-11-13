import { faker } from "@faker-js/faker";
import { Organization, Prisma, PrismaClient } from "@prisma/client";

faker.seed(42);

const organizationCreateInput: Prisma.OrganizationCreateInput[] = [
  {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
  },
  {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
  },
  {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
  },
  {
    id: faker.string.uuid(),
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
  },
];

export const load = async (db: PrismaClient): Promise<Organization[]> => {
  console.log("Seeding organizations");
  for (const organization of organizationCreateInput) {
    await db.organization.upsert({
      where: {
        id: organization.id,
      },
      update: {},
      create: organization,
    });
  }
  const organizations = await db.organization.findMany();

  return organizations;
};
