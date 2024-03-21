import type {
	BlobClient,
	BlobServiceClient,
	ContainerClient,
} from "@azure/storage-blob";
import { mockDeep } from "jest-mock-extended";
import { BlobStorageAdapter } from "~/adapters/azure-blob-storage.js";
import {
	DownstreamServiceError,
	InternalServerError,
} from "~/domain/errors.js";
import { makeMockContext } from "~/lib/context.js";
import { Result } from "~/lib/result.js";

describe("BlobStorageAdapter", () => {
	describe("#downloadToBuffer", () => {
		const mockBlobServiceClient = mockDeep<BlobServiceClient>();
		const containerClient = mockDeep<ContainerClient>();
		const blobClient = mockDeep<BlobClient>();
		mockBlobServiceClient.getContainerClient.mockReturnValue(containerClient);
		containerClient.getBlobClient.mockReturnValue(blobClient);
		const blobStorageAdapter = BlobStorageAdapter({
			blobServiceClient: mockBlobServiceClient,
			accountName: undefined,
			containerName: "test",
		});

		it("returns buffer", async () => {
			const buffer = Buffer.from("test");
			blobClient.downloadToBuffer.mockResolvedValue(buffer);
			const result = await blobStorageAdapter.downloadToBuffer(
				makeMockContext(),
				{
					fileName: "test.pdf",
				},
			);

			expect(result).toEqual(Result.success({ buffer }));
		});

		it("returns DownstreamServiceError on error", async () => {
			blobClient.downloadToBuffer.mockRejectedValue(new Error());
			const result = await blobStorageAdapter.downloadToBuffer(
				makeMockContext(),
				{
					fileName: "test.pdf",
				},
			);

			expect(result).toEqual(Result.error(expect.any(DownstreamServiceError)));
		});

		it("returns InternalServerError if container name is missing", async () => {
			const blobStorageAdapter = BlobStorageAdapter({
				blobServiceClient: mockBlobServiceClient,
				accountName: undefined,
				containerName: undefined,
			});
			const result = await blobStorageAdapter.downloadToBuffer(
				makeMockContext(),
				{
					fileName: "test.pdf",
				},
			);

			expect(result).toEqual(Result.error(expect.any(InternalServerError)));
		});
	});
});
