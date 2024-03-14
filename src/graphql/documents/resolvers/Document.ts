import type { DocumentResolvers } from "./../../types.generated.js";
export const Document: DocumentResolvers = {
	/* Implement Document resolver logic here */
	file: async ({ fileId }, _args, ctx) => {
		const getFileResult = await ctx.files.getFile(ctx, { id: fileId });
		if (!getFileResult.ok) throw getFileResult.error;
		return getFileResult.data.file;
	},
};
