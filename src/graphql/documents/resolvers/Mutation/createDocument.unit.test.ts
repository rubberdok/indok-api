import { faker } from "@faker-js/faker";
import { Document, DocumentCategory } from "~/domain/documents.js";
import { InternalServerError } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Document mutations", () => {
	describe("createDocument", () => {
		it("creates a document", async () => {
			const { client, documents } = createMockApolloServer();
			documents.documents.create.mockResolvedValue(
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
					uploadUrl: faker.internet.url(),
				}),
			);

			const { data, errors } = await client.mutate({
				mutation: graphql(`
                    mutation CreateDocument($data: CreateDocumentInput!) {
                        createDocument(data: $data) {
                            document {
                                id
                                categories {
                                    id
                                    name
                                }
                            }
                        }
                    }
                `),
				variables: {
					data: {
						name: faker.word.adjective(),
						fileExtension: "pdf",
					},
				},
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				createDocument: {
					document: {
						id: expect.any(String),
						categories: [
							{
								id: expect.any(String),
								name: expect.any(String),
							},
						],
					},
				},
			});
		});

		it("throw if an error is returned", async () => {
			const { client, documents } = createMockApolloServer();
			documents.documents.create.mockResolvedValue(
				Result.error(new InternalServerError("failed to create document")),
			);

			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation CreateDocument($data: CreateDocumentInput!) {
                        createDocument(data: $data) {
                            document {
                                id
                                categories {
                                    id
                                    name
                                }
                            }
                        }
                    }
                `),
				variables: {
					data: {
						name: faker.word.adjective(),
						fileExtension: "pdf",
					},
				},
			});

			expect(errors).toBeDefined();
		});
	});
});
