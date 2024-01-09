import type { Prisma, PrismaClient, User } from "@prisma/client";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
import { UserRepository } from "../../index.js";

const dummyUser = mockDeep<User>();
let userRepo: UserRepository;
let mockDb: DeepMockProxy<PrismaClient>;

describe("UsersRepository", () => {
	beforeAll(() => {
		mockDb = mockDeep<PrismaClient>();
		userRepo = new UserRepository(mockDb);
	});

	const usersTable: {
		input: Prisma.UserCreateInput;
		expected: User;
	}[] = [
		{
			input: {
				username: "test-1",
				email: "example@example.com",
				feideId: "asdf",
				firstName: "first",
				lastName: "last",
			},
			expected: {
				...dummyUser,
				id: "some-cuid",
				createdAt: new Date(),
				updatedAt: new Date(),
				lastLogin: new Date(),
				username: "test-1",
				email: "example@example.com",
				feideId: "asdf",
				firstName: "first",
				lastName: "last",
			},
		},
	];

	test.each(usersTable)("createUser($input)", async ({ input, expected }) => {
		mockDb.user.create.mockResolvedValueOnce(expected);

		const got = await userRepo.create(input);
		expect(got).toMatchObject(expected);
	});
});
