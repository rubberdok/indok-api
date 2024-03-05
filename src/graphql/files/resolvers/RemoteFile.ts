import type { RemoteFileResolvers } from "./../../types.generated.js";
export const RemoteFile: RemoteFileResolvers = {
	/* Implement RemoteFile resolver logic here */
	url: async ({ id }, _args, ctx) => {
		const fileDownloadUrlResult = await ctx.files.createFileDownloadUrl(ctx, {
			id,
		});
		if (!fileDownloadUrlResult.ok) {
			switch (fileDownloadUrlResult.error.name) {
				case "DownstreamServiceError":
				case "NotFoundError":
					ctx.log.error(
						"Failed to get file download url",
						fileDownloadUrlResult.error,
					);
					return null;
				case "InvalidArgumentError":
				case "InternalServerError":
					throw fileDownloadUrlResult.error;
			}
		}
		return fileDownloadUrlResult.data.url;
	},
};
