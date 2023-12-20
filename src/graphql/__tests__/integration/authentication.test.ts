import { faker } from "@faker-js/faker";
import { DeepMockProxy, mock, mockDeep, mockFn } from "jest-mock-extended";
import { NotFoundError } from "~/domain/errors.js";
import { User } from "~/domain/users.js";
import {
	GraphQLTestClient,
	newGraphQLTestClient,
} from "~/graphql/test-clients/graphql-test-client.js";
import { graphql } from "~/graphql/test-clients/integration/gql.js";
import { UserService } from "~/services/users/service.js";

describe("Apollo Context Authentication", () => {
	let client: GraphQLTestClient;
	let mockUserService: DeepMockProxy<UserService>;

	afterAll(async () => {
		await client.close();
	});

	beforeAll(async () => {
		mockUserService = mockDeep<UserService>();
		client = await newGraphQLTestClient(
			{ port: 4389 },
			{ apolloServerDependencies: { userService: mockUserService } },
		);
	});

	it("should set ctx.user if a user with the userId in session exists", async () => {
		const userId = faker.string.uuid();
		// The query will log the user in, and in doing so, it will call mockUserService.create to create the user.
		mockUserService.get.mockResolvedValue(mock<User>({ id: userId }));
		mockUserService.create.mockResolvedValue(mock<User>({ id: userId }));

		const { errors } = await client.query(
			{
				query: graphql(`
          query AuthContext {
            user {
              user {
                id
              }
            }
          }
        `),
			},
			{ user: { feideId: userId } },
		);

		expect(errors).toBeUndefined();
		expect(mockUserService.get).toHaveBeenCalledTimes(1);
	});

	it("should call log out on the request if the user in the session does not exist", async () => {
		const userId = faker.string.uuid();
		// The query will log the user in, and in doing so, it will call mockUserService.create to create the user.
		mockUserService.get.mockImplementationOnce(() => {
			throw new NotFoundError("User not found");
		});
		mockUserService.create.mockResolvedValue(mock<User>({ id: userId }));
		// We mock the logout function so we can montior that it is called
		client.dependencies.authService.logout = mockFn();

		const { errors, data } = await client.query(
			{
				query: graphql(`
          query AuthContext {
            user {
              user {
                id
              }
            }
          }
        `),
			},
			{ user: { feideId: userId } },
		);

		expect(errors).toBeUndefined();
		expect(data?.user.user).toBeNull();
		expect(mockUserService.get).toHaveBeenCalledTimes(1);
		expect(client.dependencies.authService.logout).toHaveBeenCalledWith(
			expect.objectContaining({
				session: expect.objectContaining({ authenticated: true, userId }),
			}),
		);
	});
});
