import { faker } from "@faker-js/faker";
import { DocumentCategory } from "~/domain/documents.js";
import {
	InternalServerError,
	PermissionDeniedError,
	UnauthorizedError,
} from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Document category queries", () => {
	describe("{ documentCategories }", () => {
		it("returns document categories", async () => {
			const { documents, client } = createMockApolloServer();

			const expected = new DocumentCategory({
				id: faker.string.uuid(),
				name: faker.lorem.word(),
			});

			documents.categories.findMany.mockResolvedValue({
				ok: true,
				data: {
					categories: [expected],
					total: 1,
				},
			});

			const { data, errors } = await client.query({
				query: graphql(`
                    query DocumentCategories {
                        documentCategories {
                            categories {
                                id
                                name
                            }
                            total
                        }
                    }
                `),
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				documentCategories: {
					categories: [expected],
					total: 1,
				},
			});
		});

		const testCases: { error: UnauthorizedError | PermissionDeniedError }[] = [
			{
				error: new UnauthorizedError(""),
			},
			{
				error: new PermissionDeniedError(""),
			},
		];
		test.each(testCases)("returns empty array on %p", async ({ error }) => {
			const { documents, client } = createMockApolloServer();
			documents.categories.findMany.mockResolvedValue(Result.error(error));

			const { data, errors } = await client.query({
				query: graphql(`
                    query DocumentCategories {
                        documentCategories {
                            categories {
                                id
                                name
                            }
                            total
                        }
                    }
                `),
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				documentCategories: {
					categories: [],
					total: 0,
				},
			});
		});

		it("throws on internal server error", async () => {
			const { documents, client } = createMockApolloServer();
			documents.categories.findMany.mockResolvedValue(
				Result.error(new InternalServerError("something went wrong")),
			);

			const { errors } = await client.query({
				query: graphql(`
                    query DocumentCategories {
                        documentCategories {
                            categories {
                                id
                                name
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
