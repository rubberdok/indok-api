import { faker } from "@faker-js/faker";
import { BookingTerms } from "~/domain/cabins.js";
import { InternalServerError, NotFoundError } from "~/domain/errors.js";
import { RemoteFile } from "~/domain/files.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Cabin queries", () => {
	describe("bookingTerms", () => {
		it("returns null on NotFoundError", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.getBookingTerms.mockResolvedValueOnce(
				Result.error(new NotFoundError("")),
			);

			const { data } = await client.query({
				query: graphql(`
                    query BookingTerms_Null {
                        bookingTerms {
                            bookingTerms {
                                id
                            }
                        }
                    }
                `),
			});

			expect(data).toEqual({ bookingTerms: { bookingTerms: null } });
		});

		it("returns throw on other errors", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.getBookingTerms.mockResolvedValueOnce(
				Result.error(new InternalServerError("")),
			);

			const { errors } = await client.query({
				query: graphql(`
                    query BookingTerms_Error {
                        bookingTerms {
                            bookingTerms {
                                id
                            }
                        }
                    }
                `),
			});

			expect(errors).toBeDefined();
		});

		it("returns booking terms with a remote file", async () => {
			const { client, cabinService, fileService } = createMockApolloServer();
			cabinService.getBookingTerms.mockResolvedValueOnce(
				Result.success({
					bookingTerms: new BookingTerms({
						id: faker.string.uuid(),
						createdAt: faker.date.recent(),
						fileId: faker.string.uuid(),
					}),
				}),
			);
			fileService.getFile.mockResolvedValueOnce(
				Result.success({
					file: new RemoteFile({
						id: faker.string.uuid(),
						name: faker.system.fileName(),
						userId: faker.string.uuid(),
					}),
				}),
			);
			fileService.createFileDownloadUrl.mockResolvedValueOnce(
				Result.success({
					file: new RemoteFile({
						id: faker.string.uuid(),
						name: faker.system.fileName(),
						userId: faker.string.uuid(),
					}),
					url: faker.internet.url(),
				}),
			);

			const { data, errors } = await client.query({
				query: graphql(`
                    query BookingTerms_WithFile {
                        bookingTerms {
                            bookingTerms {
                                id
                                file {
                                    id
                                    url
                                }
                            }
                        }
                    }
                `),
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				bookingTerms: {
					bookingTerms: {
						id: expect.any(String),
						file: {
							id: expect.any(String),
							url: expect.any(String),
						},
					},
				},
			});
		});
	});
});
