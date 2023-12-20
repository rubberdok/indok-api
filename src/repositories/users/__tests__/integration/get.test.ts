import { faker } from "@faker-js/faker";
import { NotFoundError } from "~/domain/errors.js";
import prisma from "~/lib/prisma.js";
import { UserRepository } from "../../index.js";

describe("UserRepository", () => {
  let userRepository: UserRepository;

  beforeAll(() => {
    userRepository = new UserRepository(prisma);
  });
  describe("#get", () => {
    it("should raise NotFoundError if user does not exist", async () => {
      await expect(userRepository.get(faker.string.uuid())).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should return user if it exists", async () => {
      const user = await userRepository.create({
        username: faker.internet.exampleEmail({
          firstName: faker.string.uuid(),
        }),
        email: faker.internet.email(),
        feideId: faker.string.uuid(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
      });
      await expect(userRepository.get(user.id)).resolves.toEqual(user);
    });
  });
});
