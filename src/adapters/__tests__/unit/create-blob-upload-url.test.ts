import type { BlobServiceClient } from "@azure/storage-blob";
import { mock, mockDeep } from "jest-mock-extended";
import { BlobStorageAdapter } from "~/adapters/azure-blob-storage.js";
import {
	DownstreamServiceError,
	InvalidArgumentError,
} from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";

describe("BlobStorageAdapter", () => {
	describe("#createBlobUploadUrl", () => {
		it("returns InvalidArgumentError if Azure Storage accountName is undefined", async () => {
			const blobStorageAdapter = BlobStorageAdapter({
				blobServiceClient: mock(),
				accountName: undefined,
				containerName: "test",
			});

			const result = await blobStorageAdapter.createSasBlobUrl(
				makeMockContext(),
				{ name: "test", action: "UPLOAD" },
			);

			expect(result).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("returns InvalidArgumentError if Azure Storage container name is undefined", async () => {
			const blobStorageAdapter = BlobStorageAdapter({
				blobServiceClient: mock(),
				accountName: "test",
				containerName: undefined,
			});

			const result = await blobStorageAdapter.createSasBlobUrl(
				makeMockContext(),
				{ name: "test", action: "UPLOAD" },
			);

			expect(result).toEqual({
				ok: false,
				error: expect.any(InvalidArgumentError),
			});
		});

		it("returns DownstreamServiceError getUserDelegation fails", async () => {
			const { blobStorageAdapter, blobServiceClient } = makeDependencies();

			blobServiceClient.getUserDelegationKey.mockRejectedValue(
				new Error("getUserDelegationKey failed"),
			);

			const result = await blobStorageAdapter.createSasBlobUrl(
				makeMockContext(),
				{ name: "test", action: "UPLOAD" },
			);

			expect(result).toEqual({
				ok: false,
				error: expect.any(DownstreamServiceError),
			});
		});

		it("returns a valid url for uploads", async () => {
			const { blobStorageAdapter, blobServiceClient } = makeDependencies();

			blobServiceClient.getUserDelegationKey.mockResolvedValue({
				signedExpiresOn: new Date(),
				signedStartsOn: new Date(),
				signedObjectId: "test",
				signedService: "test",
				signedTenantId: "test",
				signedVersion: "test",
				value: "test",
				_response: {
					bodyAsText: "test",
					headers: mock(),
					parsedBody: mock(),
					parsedHeaders: mock(),
					request: mock(),
					status: 200,
				},
			});

			const result = await blobStorageAdapter.createSasBlobUrl(
				makeMockContext(),
				{ name: "test", action: "UPLOAD" },
			);

			expect(result).toEqual({
				ok: true,
				data: {
					url: expect.stringContaining("test"),
				},
			});
		});
	});
});

function makeDependencies() {
	const blobServiceClient = mockDeep<BlobServiceClient>();

	const blobStorageAdapter = BlobStorageAdapter({
		blobServiceClient,
		accountName: "test",
		containerName: "test",
	});
	return {
		blobServiceClient,
		blobStorageAdapter,
	};
}
