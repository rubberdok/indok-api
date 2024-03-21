import type { BookingTermsResolvers } from "./../../types.generated.js";
export const BookingTerms: BookingTermsResolvers = {
	/* Implement BookingTerms resolver logic here */
	file: async ({ fileId }, _args, ctx) => {
		const result = await ctx.files.getFile(ctx, { id: fileId });
		if (!result.ok) {
			throw result.error;
		}

		return result.data.file;
	},
};
