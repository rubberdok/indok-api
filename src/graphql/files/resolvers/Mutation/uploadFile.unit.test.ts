import { InternalServerError } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("File Mutations", () => {
	describe("uploadFile", () => {
		it("throws if createFileUploadUrl fails", async () => {
			const { client, fileService } = createMockApolloServer();

			fileService.createFileUploadUrl.mockResolvedValue({
				ok: false,
				error: new InternalServerError(""),
			});

			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation CreateFileUploadUrl($data: UploadFileInput!) {
                        uploadFile(data: $data) {
                            id
                            sasUrl
                        }
                    }
                `),
				variables: {
					data: {
						extension: "txt",
					},
				},
			});

			expect(errors).toBeDefined();
		});

		it("returns id and sas url", async () => {
			const { client, fileService } = createMockApolloServer();

			fileService.createFileUploadUrl.mockResolvedValue({
				ok: true,
				data: {
					id: "test-id",
					url: "https://example.com",
				},
			});

			const { data, errors } = await client.mutate({
				mutation: graphql(`
                    mutation CreateFileUploadUrl($data: UploadFileInput!) {
                        uploadFile(data: $data) {
                            id
                            sasUrl
                        }
                    }
                `),
				variables: {
					data: {
						extension: "txt",
					},
				},
			});

			expect(errors).toBeUndefined();
			expect(data).toEqual({
				uploadFile: {
					id: "test-id",
					sasUrl: "https://example.com",
				},
			});
		});
	});
});
