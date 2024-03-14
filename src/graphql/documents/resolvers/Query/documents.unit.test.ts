import {
	InternalServerError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Documents queries", () => {
	describe("{ documents }", () => {
		it("returns all documents and the total count", async () => {
			const { documents, client } = createMockApolloServer();
			documents.documents.findMany.mockResolvedValue({
				ok: true,
				data: {
					documents: [],
					total: 0,
				},
			});

			const { data, errors } = await client.query({
				query: graphql(`
                    query Documents {
                        documents {
                            documents {
                                id
                            }
                            total
                        }
                    }
                `),
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				documents: {
					documents: [],
					total: 0,
				},
			});
		});

		it("returns empty array if unauthorized", async () => {
			const { documents, client } = createMockApolloServer();
			documents.documents.findMany.mockResolvedValue(
				Result.error(new UnauthorizedError("")),
			);

			const { data, errors } = await client.query({
				query: graphql(`
                    query Documents {
                        documents {
                            documents {
                                id
                            }
                            total
                        }
                    }
                `),
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				documents: {
					documents: [],
					total: 0,
				},
			});
		});

		it("returns empty array on permission denied", async () => {
			const { documents, client } = createMockApolloServer();
			documents.documents.findMany.mockResolvedValue(
				Result.error(new PermissionDeniedError("")),
			);

			const { data, errors } = await client.query({
				query: graphql(`
                    query Documents {
                        documents {
                            documents {
                                id
                            }
                            total
                        }
                    }
                `),
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				documents: {
					documents: [],
					total: 0,
				},
			});
		});

		it("throws on internal server error", async () => {
			const { documents, client } = createMockApolloServer();
			documents.documents.findMany.mockResolvedValue(
				Result.error(new InternalServerError("something went wrong")),
			);

			const { errors } = await client.query({
				query: graphql(`
                    query Documents {
                        documents {
                            documents {
                                id
                            }
                            total
                        }
                    }
                `),
			});

			expect(errors).toBeDefined();
		});
	});
});
