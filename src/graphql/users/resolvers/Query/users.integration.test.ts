import { faker } from "@faker-js/faker";
import type { User } from "~/domain/users.js";
import {
	type GraphQLTestClient,
	newGraphQLTestClient,
} from "~/graphql/test-clients/graphql-test-client.js";
import { graphql } from "~/graphql/test-clients/integration/gql.js";

describe("User queries", () => {
	let client: GraphQLTestClient;

	beforeAll(async () => {
		client = await newGraphQLTestClient();
	});

	afterAll(async () => {
		await client.close();
	});

	describe("users", () => {
		describe("as a super user", () => {
			it("should return all users, including sensitive information", async () => {
				/**
				 * Arrange
				 *
				 * Create a super user
				 * Create 3 additional users
				 */
				const superUser = await makeUser({ isSuperUser: true });
				const user1 = await makeUser();
				const user2 = await makeUser();
				const user3 = await makeUser();

				/**
				 * Act
				 *
				 * Perform a query to fetch all users
				 */
				const { data, errors } = await client.query(
					{
						query: graphql(`
              query users {
                users {
                  users {
                    id
                  }
                  super {
                    id
                    email
                  }
                }
              }
            `),
					},
					{
						user: { id: superUser.id },
					},
				);

				/**
				 * Assert
				 *
				 * Assert that all users are returned, both in users and super without errors
				 */
				expect(errors).toBeUndefined();

				expect(data?.users.users.length).toBeGreaterThanOrEqual(4);
				expect(data?.users.super.length).toBeGreaterThanOrEqual(4);

				const usersIds = data?.users.users.map((user) => user.id);
				expect(usersIds).toContain(user1.id);
				expect(usersIds).toContain(user2.id);
				expect(usersIds).toContain(user3.id);

				const superIds = data?.users.super.map((user) => user.id);
				expect(superIds).toContain(user1.id);
				expect(superIds).toContain(user2.id);
				expect(superIds).toContain(user3.id);
			});
		});
	});

	function makeUser(
		data: Partial<{ isSuperUser: boolean }> = {},
	): Promise<User> {
		return client.services.users.create({
			feideId: faker.string.uuid(),
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			email: faker.internet.email(),
			username: faker.string.sample(20),
			...data,
		});
	}
});
