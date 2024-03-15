import { faker } from "@faker-js/faker";
import type { Cabin } from "~/domain/cabins.js";
import { InvalidArgumentErrorV2 } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Cabin Mutations", () => {
	describe("#createCabin", () => {
		it("throws if an error is returned", async () => {
			const { client, cabinService } = createMockApolloServer();

			cabinService.createCabin.mockResolvedValueOnce(
				Result.error(
					new InvalidArgumentErrorV2("invalid argument", {
						reason: {
							name: ["required"],
						},
					}),
				),
			);
			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation createCabin($data: CreateCabinInput!) {
                        createCabin(data: $data) {
                            cabin {
                                id
                            }
                        }
                    }
                `),
				variables: {
					data: {
						name: "test",
						capacity: 10,
						internalPrice: 100,
						externalPrice: 200,
						internalPriceWeekend: 150,
						externalPriceWeekend: 250,
					},
				},
			});

			expect(errors).toBeDefined();
			expect(errors).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "invalid argument",
						extensions: expect.objectContaining({
							reason: { name: ["required"] },
						}),
					}),
				]),
			);
		});

		it("creates a cabin", async () => {
			const { client, cabinService } = createMockApolloServer();

			cabinService.createCabin.mockResolvedValueOnce(
				Result.success({
					cabin: {
						id: faker.string.uuid(),
					} as Cabin,
				}),
			);
			const { errors, data } = await client.mutate({
				mutation: graphql(`
                    mutation createCabin($data: CreateCabinInput!) {
                        createCabin(data: $data) {
                            cabin {
                                id
                            }
                        }
                    }
                `),
				variables: {
					data: {
						name: "test",
						capacity: 10,
						internalPrice: 100,
						externalPrice: 200,
						internalPriceWeekend: 150,
						externalPriceWeekend: 250,
					},
				},
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				createCabin: {
					cabin: {
						id: expect.any(String),
					},
				},
			});
		});
	});
});
