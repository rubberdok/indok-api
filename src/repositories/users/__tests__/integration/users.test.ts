import { PrismaClient } from "@prisma/client";

import prisma from "@/lib/prisma";
import { IUserRepository } from "@/repositories/interfaces";
import { UserRepository } from "@/repositories/users";

import { CreateUserCase } from "./interfaces";

let db: PrismaClient;
let userRepository: IUserRepository;

beforeAll(() => {
  db = prisma;
  userRepository = new UserRepository(db);
});

beforeEach(async () => {
  const user = await db.user.findFirst({
    where: {
      feideId: "test-1",
    },
  });
  if (user !== null) {
    await db.user.delete({
      where: {
        id: user.id,
      },
    });
  }
});

const usersTable: CreateUserCase[] = [
  {
    input: {
      username: "test-1",
      email: "example@example.com",
      feideId: "test-1",
      firstName: "first",
      lastName: "last",
    },
    expected: {
      username: "test-1",
      email: "example@example.com",
      feideId: "test-1",
      firstName: "first",
      lastName: "last",
    },
  },
];

test.each(usersTable)("createUser($input)", async ({ input, expected }) => {
  const got = await userRepository.create(input);
  const { username, email, feideId, firstName, lastName } = got;
  expect({ username, email, feideId, firstName, lastName }).toMatchObject(expected);
  expect(got.id).toBeTruthy();
  expect(got.createdAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
});
