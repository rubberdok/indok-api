import {
	BlobSASPermissions,
	type BlobSASSignatureValues,
	type BlobServiceClient as BlobServiceClientType,
	type UserDelegationKey,
	generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { DateTime } from "luxon";
import {
	DownstreamServiceError,
	InternalServerError,
	InvalidArgumentError,
} from "~/domain/errors.js";
import type { Context } from "~/lib/context.js";
import type { Result, ResultAsync } from "~/lib/result.js";
import type { BlobStorageAdapter as BlobStorageAdapterType } from "~/services/files/index.js";

type Dependencies = {
	blobServiceClient: BlobServiceClientType;
	accountName?: string;
	containerName?: string;
};

function BlobStorageAdapter({
	blobServiceClient,
	accountName,
	containerName,
}: Dependencies): BlobStorageAdapterType {
	function getSasOptions(
		ctx: Context,
		params: {
			name: string;
			action: "UPLOAD" | "DOWNLOAD" | "DELETE";
			startsOn: Date;
			expiresOn: Date;
		},
	): Result<
		{
			options: BlobSASSignatureValues;
		},
		InternalServerError | InvalidArgumentError
	> {
		const { name, action, startsOn, expiresOn } = params;
		if (!containerName) {
			return {
				ok: false,
				error: new InvalidArgumentError(
					"Azure Storage containerName not found",
				),
			};
		}

		try {
			let permissions: BlobSASPermissions;
			switch (action) {
				case "UPLOAD": {
					permissions = BlobSASPermissions.parse("cw");
					break;
				}
				case "DELETE": {
					permissions = BlobSASPermissions.parse("d");
					break;
				}
				case "DOWNLOAD": {
					permissions = BlobSASPermissions.parse("rl");
					break;
				}
			}

			const sasOptions: BlobSASSignatureValues = {
				blobName: name,
				containerName,
				permissions,
				startsOn,
				expiresOn,
			};
			return {
				ok: true,
				data: {
					options: sasOptions,
				},
			};
		} catch (err) {
			return {
				ok: false,
				error: new InternalServerError("misconfigured sas options", err),
			};
		}
	}

	async function newUserDelegationKey(
		ctx: Context,
	): ResultAsync<
		{ userDelegationKey: UserDelegationKey; expiresOn: Date; startsOn: Date },
		DownstreamServiceError
	> {
		const TEN_MINUTES_BEFORE_NOW = DateTime.now()
			.minus({ minutes: 10 })
			.toJSDate();
		const TEN_MINUTES_AFTER_NOW = DateTime.now()
			.plus({ minutes: 10 })
			.toJSDate();

		try {
			const userDelegationKey = await blobServiceClient.getUserDelegationKey(
				TEN_MINUTES_BEFORE_NOW,
				TEN_MINUTES_AFTER_NOW,
			);
			return {
				ok: true,
				data: {
					userDelegationKey,
					startsOn: TEN_MINUTES_BEFORE_NOW,
					expiresOn: TEN_MINUTES_AFTER_NOW,
				},
			};
		} catch (err) {
			return {
				ok: false,
				error: new DownstreamServiceError(
					"failed to get user delegation key",
					err,
				),
			};
		}
	}

	return {
		async createSasBlobUrl(
			ctx: Context,
			params: { name: string; action: "UPLOAD" | "DOWNLOAD" | "DELETE" },
		): ResultAsync<
			{ url: string },
			InternalServerError | DownstreamServiceError | InvalidArgumentError
		> {
			if (!accountName || !containerName) {
				return {
					ok: false,
					error: new InvalidArgumentError(
						"Azure Storage accountName or containerName not found",
					),
				};
			}

			const getUserDelegationKeyResult = await newUserDelegationKey(ctx);
			if (!getUserDelegationKeyResult.ok) {
				return getUserDelegationKeyResult;
			}
			const { userDelegationKey, startsOn, expiresOn } =
				getUserDelegationKeyResult.data;
			const getSasOptionsResult = getSasOptions(ctx, {
				name: params.name,
				action: "UPLOAD",
				startsOn,
				expiresOn,
			});

			if (!getSasOptionsResult.ok) {
				return getSasOptionsResult;
			}
			const { options } = getSasOptionsResult.data;
			const sasToken = generateBlobSASQueryParameters(
				options,
				userDelegationKey,
				accountName,
			);

			const sasUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${params.name}?${sasToken}`;

			return {
				ok: true,
				data: {
					url: sasUrl,
				},
			};
		},
	};
}

export { BlobStorageAdapter };
