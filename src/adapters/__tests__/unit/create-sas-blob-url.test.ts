import assert from "node:assert";
import type {
	BlobServiceClient,
	ServiceGetUserDelegationKeyResponse,
} from "@azure/storage-blob";
import { type DeepMockProxy, mock, mockDeep } from "jest-mock-extended";
import { DateTime } from "luxon";
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

		describe("when getUserDelegationKey succeeds", () => {
			let blobStorageAdapter: ReturnType<typeof BlobStorageAdapter>;
			let blobServiceClient: DeepMockProxy<BlobServiceClient>;
			beforeAll(() => {
				({ blobStorageAdapter, blobServiceClient } = makeDependencies());
				blobServiceClient.getUserDelegationKey.mockImplementation(
					mockGetUserDelegationKeyImplementation,
				);
			});

			it("returns a valid url for uploads", async () => {
				const result = await blobStorageAdapter.createSasBlobUrl(
					makeMockContext(),
					{ name: "test", action: "UPLOAD" },
				);
				if (!result.ok) throw result.error;

				const { url } = result.data;

				// Check that the url contains the parameters for create/write
				expect(url).toEqual(expect.stringContaining("sp=cw"));
				// Check that the url contains the parameters for the signed resource being a blob
				expect(url).toEqual(expect.stringContaining("sr=b"));
			});

			it("returns a valid url for downloads", async () => {
				const result = await blobStorageAdapter.createSasBlobUrl(
					makeMockContext(),
					{ name: "test", action: "DOWNLOAD" },
				);
				if (!result.ok) throw result.error;

				const { url } = result.data;

				// Check that the url contains the parameters for read
				expect(url).toEqual(expect.stringContaining("sp=r"));
				// Check that the url contains the parameters for the signed resource being a blob
				expect(url).toEqual(expect.stringContaining("sr=b"));
			});

			it("returns a valid url for delete", async () => {
				const result = await blobStorageAdapter.createSasBlobUrl(
					makeMockContext(),
					{ name: "test", action: "DELETE" },
				);
				if (!result.ok) throw result.error;

				const { url } = result.data;

				// Check that the url contains the parameters for read/delete
				expect(url).toEqual(expect.stringContaining("sp=rd"));
				// Check that the url contains the parameters for the signed resource being a blob
				expect(url).toEqual(expect.stringContaining("sr=b"));
			});

			it("sets a one hour expiry for downloads", async () => {
				// Set this prior to the test so that it doesn't matter that the test take some miliseconds to complete.
				const expected = DateTime.now().plus({ minutes: 60 });

				const result = await blobStorageAdapter.createSasBlobUrl(
					makeMockContext(),
					{ name: "test", action: "DOWNLOAD" },
				);
				if (!result.ok) throw result.error;
				const parsedUrl = new URL(result.data.url);
				const expires = parsedUrl.searchParams.get("se");
				assert(expires !== null);
				const expiryDate = DateTime.fromISO(expires);
				if (!expiryDate.isValid) throw new Error("Invalid expiry date");
				expect(expiryDate.toMillis()).toBeCloseTo(expected.toMillis(), -4);
			});

			it("sets a 10 minute expiry for uploads", async () => {
				// Set this prior to the test so that it doesn't matter that the test take some miliseconds to complete.
				const expected = DateTime.now().plus({ minutes: 10 });

				const result = await blobStorageAdapter.createSasBlobUrl(
					makeMockContext(),
					{ name: "test", action: "UPLOAD" },
				);
				if (!result.ok) throw result.error;
				const parsedUrl = new URL(result.data.url);
				const expires = parsedUrl.searchParams.get("se");
				assert(expires !== null);
				const expiryDate = DateTime.fromISO(expires);
				if (!expiryDate.isValid) throw new Error("Invalid expiry date");
				expect(expiryDate.toMillis()).toBeCloseTo(expected.toMillis(), -4);
			});

			it("sets a 10 minute expiry for delete", async () => {
				// Set this prior to the test so that it doesn't matter that the test take some miliseconds to complete.
				const expected = DateTime.now().plus({ minutes: 10 });

				const result = await blobStorageAdapter.createSasBlobUrl(
					makeMockContext(),
					{ name: "test", action: "DELETE" },
				);
				if (!result.ok) throw result.error;
				const parsedUrl = new URL(result.data.url);
				const expires = parsedUrl.searchParams.get("se");
				assert(expires !== null);
				const expiryDate = DateTime.fromISO(expires);
				if (!expiryDate.isValid) throw new Error("Invalid expiry date");
				expect(expiryDate.toMillis()).toBeCloseTo(expected.toMillis(), -4);
			});
		});
	});
});

function mockGetUserDelegationKeyImplementation(
	startsOn: Date,
	expiresOn: Date,
): Promise<ServiceGetUserDelegationKeyResponse> {
	return Promise.resolve({
		signedExpiresOn: expiresOn,
		signedStartsOn: startsOn,
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
}

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
