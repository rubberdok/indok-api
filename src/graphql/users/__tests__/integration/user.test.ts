import { faker } from "@faker-js/faker";
import {
	type GraphQLTestClient,
	newGraphQLTestClient,
} from "~/graphql/test-clients/graphql-test-client.js";
import { graphql } from "~/graphql/test-clients/integration/gql.js";

describe("Users", () => {
	let client: GraphQLTestClient;

	beforeAll(async () => {
		client = await newGraphQLTestClient();
	});

	afterAll(async () => {
		await client.close();
	});

	describe("query user", () => {
		it("should return null if no user is logged in", async () => {
			const { data } = await client.query({
				query: graphql(`
          query me {
            user {
              user {
                id
              }
            }
          }
        `),
			});
			expect(data).toBeDefined();
			expect(data?.user.user).toBeNull();
		});

		it("should return the logged in user", async () => {
			/**
			 * Arrange
			 *
			 * Create a user
			 */
			const user =
				await client.dependencies.apolloServerDependencies.userService.create({
					feideId: faker.string.uuid(),
					firstName: faker.person.firstName(),
					lastName: faker.person.lastName(),
					email: faker.internet.email(),
					username: faker.string.sample(20),
				});

			const { data } = await client.query(
				{
					query: graphql(`
            query loggedIn {
              user {
                user {
                  id
                }
              }
            }
          `),
				},
				{
					userId: user.id,
				},
			);

			expect(data).toBeDefined();
			expect(data?.user.user).toEqual({
				id: expect.any(String),
			});
		});
	});
});
