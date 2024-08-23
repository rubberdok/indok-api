import { faker } from "@faker-js/faker";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import type { User } from "~/domain/users.js";
import {
	type GraphQLTestClient,
	newGraphQLTestClient,
} from "~/graphql/test-clients/graphql-test-client.js";
import { graphql } from "~/graphql/test-clients/integration/gql.js";
import type { UserService } from "~/services/users/service.js";

describe("Apollo Context Authentication", () => {
	let client: GraphQLTestClient;
	let mockUserService: DeepMockProxy<UserService>;

	afterAll(async () => {
		await client.close();
	});

	beforeAll(async () => {
		mockUserService = mockDeep<UserService>();
		client = await newGraphQLTestClient({
			users: mockUserService,
		});
	});

	it("ctx.user should be set", async () => {
		const userId = faker.string.uuid();
		// The query will log the user in, and in doing so, it will call mockUserService.create to create the user.
		mockUserService.get.mockResolvedValue(mock<User>({ id: userId }));
		mockUserService.create.mockResolvedValue(mock<User>({ id: userId }));

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
		expect(mockUserService.get).toHaveBeenCalledTimes(2);
		expect(data?.user.user?.id).toBe(userId);
	});
});
