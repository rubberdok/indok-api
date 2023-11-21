import { faker } from "@faker-js/faker";

import prisma from "@/lib/prisma.js";

import { CabinRepository } from "../../index.js";

describe("CabinRepository", () => {
  let cabinRepository: CabinRepository;
  beforeAll(() => {
    cabinRepository = new CabinRepository(prisma);
  });

  describe("findManyCabins", () => {
    it("should return all cabins", async () => {
      /**
       * Arrange
       *
       * Create 3 cabins
       */
      const cabin1 = await makeCabin();
      const cabin2 = await makeCabin();
      const cabin3 = await makeCabin();

      /**
       * Act
       *
       * Call findManyCabins
       */
      const actual = await cabinRepository.findManyCabins();

      /**
       * Assert
       *
       * The result should contain all 3 cabins
       */
      const ids = actual.map((cabin) => cabin.id);
      expect(actual.length).toBeGreaterThanOrEqual(3);
      expect(ids).toContain(cabin1.id);
      expect(ids).toContain(cabin2.id);
      expect(ids).toContain(cabin3.id);
    });
  });
});

async function makeCabin() {
  return await prisma.cabin.create({
    data: {
      organization: {
        create: {
          name: faker.string.sample(20),
        },
      },
      id: faker.string.uuid(),
      name: faker.string.sample(),
      capacity: faker.number.int({ max: 10 }),
      internalPrice: faker.number.int({ max: 2000 }),
      externalPrice: faker.number.int({ max: 2000 }),
    },
  });
}
