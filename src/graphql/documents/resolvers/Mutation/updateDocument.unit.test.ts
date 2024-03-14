import { faker } from "@faker-js/faker";
import { Document, DocumentCategory } from "~/domain/documents.js";
import { InternalServerError } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Document mutations", () => {
	describe("updateDocument", () => {
		it("updates a document", async () => {
			const { client, documents } = createMockApolloServer();
			documents.documents.update.mockResolvedValue(
				Result.success({
					document: new Document({
						id: faker.string.uuid(),
						createdAt: new Date(),
						fileId: faker.string.uuid(),
						name: faker.word.adjective(),
						updatedAt: new Date(),
						categories: [
							new DocumentCategory({
								id: faker.string.uuid(),
								name: faker.string.uuid(),
							}),
						],
					}),
				}),
			);

			const { data, errors } = await client.mutate({
				mutation: graphql(`
                    mutation UpdateDocument($data: UpdateDocumentInput!) {
                        updateDocument(data: $data) {
                            document {
                                id
                            }
                        }
                    }
                `),
				variables: {
					data: {
						id: faker.string.uuid(),
					},
				},
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				updateDocument: {
					document: {
						id: expect.any(String),
					},
				},
			});
		});

		it("throws if an error is returned", async () => {
			const { client, documents } = createMockApolloServer();
			documents.documents.update.mockResolvedValue(
				Result.error(new InternalServerError("failed to create document")),
			);

			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation UpdateDocument($data: UpdateDocumentInput!) {
                        updateDocument(data: $data) {
                            document {
                                id
                            }
                        }
                    }
                `),
				variables: {
					data: {
						id: faker.string.uuid(),
					},
				},
			});

			expect(errors).toBeDefined();
		});
	});
});
