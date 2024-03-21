import { faker } from "@faker-js/faker";
import { BookingTerms } from "~/domain/cabins.js";
import { PermissionDeniedError, errorCodes } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Cabin mutations", () => {
	describe("updateBookingTerms", () => {
		it("updates booking terms", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.updateBookingTerms.mockResolvedValueOnce(
				Result.success({
					bookingTerms: new BookingTerms({
						id: faker.string.uuid(),
						createdAt: faker.date.recent(),
						fileId: faker.string.uuid(),
					}),
					uploadUrl: faker.internet.url(),
				}),
			);

			const { data } = await client.mutate({
				mutation: graphql(`
                    mutation UpdateBookingTerms {
                        updateBookingTerms {
                            bookingTerms {
                                id
                            }
                            uploadUrl
                        }
                    }
                `),
			});

			expect(data).toEqual({
				updateBookingTerms: {
					bookingTerms: {
						id: expect.any(String),
					},
					uploadUrl: expect.any(String),
				},
			});
		});

		it("throws on error", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.updateBookingTerms.mockResolvedValueOnce(
				Result.error(new PermissionDeniedError("")),
			);

			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation UpdateBookingTerms {
                        updateBookingTerms {
                            bookingTerms {
                                id
                            }
                            uploadUrl
                        }
                    }
                `),
			});

			expect(errors).toBeDefined();
			expect(errors).toHaveLength(1);
			expect(errors).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						extensions: expect.objectContaining({
							code: errorCodes.ERR_PERMISSION_DENIED,
						}),
					}),
				]),
			);
		});
	});
});
