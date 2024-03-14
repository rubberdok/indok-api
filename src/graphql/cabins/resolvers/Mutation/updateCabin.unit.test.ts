import { faker } from "@faker-js/faker";
import type { Cabin } from "@prisma/client";
import { newInvalidArgumentError } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Cabin Mutations", () => {
	describe("#updateCabin", () => {
		it("updates the cabin", async () => {
			const { client, cabinService } = createMockApolloServer();

			cabinService.updateCabin.mockResolvedValue({
				ok: true,
				data: {
					cabin: {
						id: faker.string.uuid(),
					} as Cabin,
				},
			});

			const { data } = await client.mutate({
				mutation: graphql(`
                    mutation updateCabin($data: UpdateCabinInput!) {
                            updateCabin(data: $data) { 
                                cabin {
                                    id
                                }
                            }
                    }
                `),
				variables: {
					data: {
						id: faker.string.uuid(),
						name: faker.word.adjective(),
					},
				},
			});

			expect(data).toEqual({
				updateCabin: {
					cabin: {
						id: expect.any(String),
					},
				},
			});
		});

		it("throws if updateCabin returns an error", async () => {
			const { client, cabinService } = createMockApolloServer();

			cabinService.updateCabin.mockResolvedValue({
				ok: false,
				error: newInvalidArgumentError({ message: "" }),
			});

			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation updateCabin($data: UpdateCabinInput!) {
                            updateCabin(data: $data) { 
                                cabin {
                                    id
                                }
                            }
                    }
                `),
				variables: {
					data: {
						id: faker.string.uuid(),
						name: faker.word.adjective(),
					},
				},
			});

			expect(errors).toBeDefined();
		});
	});
});
